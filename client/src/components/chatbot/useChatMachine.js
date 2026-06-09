// The bot runtime — walks the conversation.js node graph, accumulates an order
// `draft`, and dispatches actions (handoff / contact / navigate / restart).
//
// This is the transport boundary for Phase 2: today every turn is resolved from
// the local node graph; a future live-chat mode would feed `messages` from a
// socket instead, while the presentational components stay unchanged.

import {
  useCallback, useContext, useMemo, useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import business from '../../data/business';
import { nodes, START, buildOrderNavState } from './conversation';

const resolve = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

export default function useChatMachine({ onClose } = {}) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const ctxOf = useCallback((draft) => ({ draft, user }), [user]);

  const [nodeId, setNodeId] = useState(START);
  const [draft, setDraft] = useState({});
  const [messages, setMessages] = useState(() => [
    { key: 1, from: 'bot', text: resolve(nodes[START].message, { draft: {}, user: null }) },
  ]);
  const [inputError, setInputError] = useState('');
  const [contactMode, setContactMode] = useState(false);

  // Key is derived from the previous message inside the updater so it stays pure
  // (StrictMode double-invokes updaters) and always monotonic / unique.
  const push = useCallback((from, text) => {
    setMessages((m) => [...m, { key: (m[m.length - 1]?.key || 0) + 1, from, text }]);
  }, []);

  const goTo = useCallback((id, draftForCtx) => {
    setNodeId(id);
    setInputError('');
    push('bot', resolve(nodes[id].message, ctxOf(draftForCtx)));
  }, [ctxOf, push]);

  const restart = useCallback(() => {
    setDraft({});
    setNodeId(START);
    setInputError('');
    setContactMode(false);
    setMessages([{ key: 1, from: 'bot', text: resolve(nodes[START].message, ctxOf({})) }]);
  }, [ctxOf]);

  const dispatch = useCallback((action, mergedDraft) => {
    if (action === 'handoffOrder') {
      navigate('/order', { state: buildOrderNavState(mergedDraft) });
      onClose?.();
      return;
    }
    if (action === 'openContact') { setContactMode(true); return; }
    if (action === 'emailUs') { window.location.href = `mailto:${business.email}`; return; }
    if (action === 'restart') { restart(); return; }
    if (action.startsWith('navigate:')) { navigate(action.slice('navigate:'.length)); }
  }, [navigate, onClose, restart]);

  const choose = useCallback((option) => {
    const merged = option.set
      ? { ...draft, ...option.set(draft, option.value, ctxOf(draft)) }
      : draft;
    push('user', option.label);
    setDraft(merged);
    if (option.action) { dispatch(option.action, merged); return; }
    goTo(resolve(option.next, ctxOf(merged)), merged);
  }, [draft, ctxOf, dispatch, goTo, push]);

  const submitInput = useCallback((value) => {
    const { input } = nodes[nodeId];
    if (!input) return;
    const err = input.validate ? input.validate(value) : null;
    if (err) { setInputError(err); return; }
    const merged = input.set
      ? { ...draft, ...input.set(draft, value, ctxOf(draft)) }
      : draft;
    push('user', value.trim() ? value : '—');
    setDraft(merged);
    goTo(resolve(input.next, ctxOf(merged)), merged);
  }, [nodeId, draft, ctxOf, goTo, push]);

  const exitContact = useCallback(() => setContactMode(false), []);

  const node = nodes[nodeId];
  const options = useMemo(
    () => (node.kind === 'choices' ? resolve(node.options, ctxOf(draft)) : []),
    [node, draft, ctxOf],
  );
  const inputConfig = node.kind === 'input' ? node.input : null;

  return {
    messages,
    node,
    options,
    inputConfig,
    inputError,
    contactMode,
    choose,
    submitInput,
    exitContact,
    restart,
  };
}
