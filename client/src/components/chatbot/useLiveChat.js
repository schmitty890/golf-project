// Customer side of live chat. Opens a socket only while `active` (the widget is in live mode),
// authenticating with the logged-in JWT or, for guests, an unguessable id persisted in localStorage
// (same privacy idea as an order tracking token). Messages come from the server (history + echoes).
import {
  useEffect, useRef, useState, useContext, useCallback,
} from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const GUEST_KEY = 'volw-chat-guest-id';

function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = (window.crypto?.randomUUID?.()) || `g_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return `g_${Date.now()}`;
  }
}

export default function useLiveChat(active) {
  const { token } = useContext(AuthContext);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const socket = io(API_URL, {
      auth: { token: token || undefined, guestId: token ? undefined : getGuestId() },
    });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:history', ({ messages: msgs }) => setMessages(msgs || []));
    socket.on('chat:message', ({ message }) => setMessages((prev) => [...prev, message]));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [active, token]);

  const send = useCallback((text) => {
    const body = (text || '').trim();
    if (body && socketRef.current) socketRef.current.emit('chat:send', { text: body });
  }, []);

  return { connected, messages, send };
}
