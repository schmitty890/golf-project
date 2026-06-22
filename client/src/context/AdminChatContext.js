// App-level live-chat state for the admin. Holds a single persistent admin socket so the owner is
// notified (chime + desktop notification + unread count) from ANY page, not just the chat page.
// Every consumer — chat page, sidebar badge, floating fab, tab title — reads from here.
// Inert for non-admins (no socket, no badge).
import {
  createContext, useContext, useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const AdminChatContext = createContext(null);
export const useAdminChat = () => useContext(AdminChatContext) || {};

// A louder two-note chime via Web Audio (no asset). Gain ~0.5 vs the old single 0.08 beep.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [{ f: 880, t: 0 }, { f: 1174.66, t: 0.15 }].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + t;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.start(start);
      osc.stop(start + 0.24);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    /* ignore */
  }
}

function desktopNotify(title, body) {
  try {
    if (window.Notification && Notification.permission === 'granted') {
      const n = new Notification(title, { body });
      setTimeout(() => n.close(), 6000);
    }
  } catch {
    /* ignore */
  }
}

export function AdminChatProvider({ children }) {
  const { token, user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;
  const baseTitleRef = useRef(null);
  if (baseTitleRef.current === null) {
    baseTitleRef.current = (document.title || 'VOLW Firewood').replace(/^\(\d+\)\s*/, '');
  }

  const totalUnread = useMemo(
    () => conversations.reduce((n, c) => n + (c.unreadForAdmin || 0), 0),
    [conversations],
  );

  const bumpConversation = useCallback((conversationId, patch) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversationId);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], ...patch };
      return [updated, ...prev.filter((c) => c.id !== conversationId)];
    });
  }, []);

  // Load availability + conversations (admin only); request notification permission.
  useEffect(() => {
    if (!isAdmin || !token) {
      setConversations([]);
      setSelectedId(null);
      setMessages([]);
      return;
    }
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    axios.get(`${API_URL}/api/settings/availability`)
      .then((res) => setAvailable(Boolean(res.data.chat?.available)))
      .catch(() => {});
    axios.get(`${API_URL}/api/chat/conversations`, authHeaders)
      .then((res) => setConversations(res.data || []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load conversations'));
    try {
      if (window.Notification && Notification.permission === 'default') Notification.requestPermission();
    } catch { /* ignore */ }
  }, [isAdmin, token]);

  // Single persistent admin socket.
  useEffect(() => {
    if (!isAdmin || !token) return undefined;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('chat:history', ({ conversationId, messages: msgs }) => {
      if (conversationId === selectedIdRef.current) setMessages(msgs || []);
    });
    socket.on('chat:message', ({ conversationId, message }) => {
      if (conversationId === selectedIdRef.current) setMessages((prev) => [...prev, message]);
      if (message.from === 'customer') {
        bumpConversation(conversationId, {
          lastMessageText: message.text, lastMessageAt: message.createdAt,
        });
      }
    });
    socket.on('chat:notify', ({ conversationId, preview, customerName }) => {
      if (conversationId === selectedIdRef.current) return;
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conversationId);
        const base = exists || {
          id: conversationId, customerName, isGuest: customerName === 'Guest', unreadForAdmin: 0,
        };
        const updated = {
          ...base,
          customerName: base.customerName || customerName,
          lastMessageText: preview,
          lastMessageAt: new Date().toISOString(),
          unreadForAdmin: (base.unreadForAdmin || 0) + 1,
        };
        return [updated, ...prev.filter((c) => c.id !== conversationId)];
      });
      playChime();
      desktopNotify(`New message from ${customerName}`, preview);
    });
    socket.on('chat:read', ({ conversationId }) => {
      bumpConversation(conversationId, { unreadForAdmin: 0 });
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [isAdmin, token, bumpConversation]);

  // Reflect the unread count in the browser tab title — visible on every page/tab.
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) ${baseTitleRef.current}` : baseTitleRef.current;
  }, [totalUnread]);

  const selectConversation = useCallback((id) => {
    setSelectedId(id);
    setMessages([]);
    socketRef.current?.emit('admin:join', { conversationId: id });
    bumpConversation(id, { unreadForAdmin: 0 });
  }, [bumpConversation]);

  const sendReply = useCallback((text) => {
    const body = (text || '').trim();
    if (!body || !selectedIdRef.current) return;
    socketRef.current?.emit('admin:send', { conversationId: selectedIdRef.current, text: body });
  }, []);

  const toggleAvailable = useCallback(async (next) => {
    setAvailable(next);
    try {
      await axios.put(
        `${API_URL}/api/settings/availability`,
        { chat: { available: next } },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      setAvailable(!next);
      setError(err.response?.data?.error || 'Failed to update availability');
    }
  }, [token]);

  const value = useMemo(() => ({
    isAdmin,
    conversations,
    selectedId,
    messages,
    available,
    error,
    totalUnread,
    selectConversation,
    sendReply,
    toggleAvailable,
    setError,
  }), [
    isAdmin, conversations, selectedId, messages, available, error, totalUnread,
    selectConversation, sendReply, toggleAvailable,
  ]);

  return <AdminChatContext.Provider value={value}>{children}</AdminChatContext.Provider>;
}

AdminChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
