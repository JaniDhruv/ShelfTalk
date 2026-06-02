import { io } from 'socket.io-client';

const apiBase = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const socketUrl = apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '');

let chatSocket = null;
let activeUserId = null;

export const getChatSocket = (userId) => {
  if (!userId) return null;

  if (chatSocket && activeUserId !== userId) {
    chatSocket.disconnect();
    chatSocket = null;
  }

  if (!chatSocket) {
    activeUserId = userId;
    chatSocket = io(socketUrl, {
      autoConnect: false,
      auth: { userId },
      transports: ['websocket', 'polling'],
    });
  }

  chatSocket.auth = { userId };
  if (!chatSocket.connected) {
    chatSocket.connect();
  }

  return chatSocket;
};

export const disconnectChatSocket = () => {
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
    activeUserId = null;
  }
};
