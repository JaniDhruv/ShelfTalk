import { Server } from 'socket.io';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import {
  createDmConversationForUsers,
  deleteChatMessage,
  editChatMessage,
  getConversationForUser,
  getConversationMessages,
  getGroupMessagesForUser,
  listConversationsForUser,
  sendConversationMessage,
  sendGroupMessage,
  setConversationBlocked,
} from '../services/chatService.js';
import {
  conversationRoom,
  emitConversationUpdated,
  emitMessageCreated,
  emitMessageDeleted,
  emitMessageEdited,
  userRoom,
} from './chatEvents.js';

const activeUserSockets = new Map();

const toId = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const makeSocketError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const ackOk = (ack, payload = {}) => {
  if (typeof ack === 'function') {
    ack({ ok: true, ...payload });
  }
};

const ackError = (ack, error) => {
  if (typeof ack === 'function') {
    ack({
      ok: false,
      message: error?.message || 'Unexpected socket error',
      status: error?.status || 500,
    });
  }
};

const resolveUserId = (socket, requestedUserId) => {
  const socketUserId = socket.data.userId;
  const targetUserId = requestedUserId || socketUserId;

  if (!targetUserId) {
    throw makeSocketError('User id is required', 400);
  }

  if (socketUserId && requestedUserId && socketUserId !== requestedUserId.toString()) {
    throw makeSocketError('Socket user mismatch', 403);
  }

  return targetUserId.toString();
};

const addActiveSocket = async (io, userId, socketId) => {
  const sockets = activeUserSockets.get(userId) || new Set();
  sockets.add(socketId);
  activeUserSockets.set(userId, sockets);

  await markPresence(userId, true);
  io.emit('presence:update', {
    userId,
    isOnline: true,
    lastSeen: new Date(),
  });
};

const removeActiveSocket = async (io, userId, socketId) => {
  const sockets = activeUserSockets.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size > 0) {
    activeUserSockets.set(userId, sockets);
    return;
  }

  activeUserSockets.delete(userId);
  const lastSeen = new Date();
  await markPresence(userId, false, lastSeen);
  io.emit('presence:update', {
    userId,
    isOnline: false,
    lastSeen,
  });
};

const markPresence = async (userId, isOnline, lastSeen = new Date()) => {
  if (!userId) return;

  const profile = await Profile.findOneAndUpdate(
    { user: userId },
    {
      $set: { isOnline, lastSeen },
      $setOnInsert: { user: userId },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const user = await User.findById(userId);
  if (user && profile && toId(user.profile) !== toId(profile._id)) {
    user.profile = profile._id;
    await user.save({ validateBeforeSave: false });
  }
};

const guarded = (handler) => async (payload = {}, ack) => {
  try {
    await handler(payload, ack);
  } catch (error) {
    ackError(ack, error);
  }
};

export const configureChatSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    },
  });

  io.on('connection', (socket) => {
    const handshakeUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (handshakeUserId) {
      socket.data.userId = handshakeUserId.toString();
      socket.join(userRoom(socket.data.userId));
      addActiveSocket(io, socket.data.userId, socket.id).catch((error) => {
        console.error('Socket presence connect error:', error.message);
      });
    }

    socket.on('chat:list', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const conversations = await listConversationsForUser(userId);
      ackOk(ack, { conversations });
    }));

    socket.on('chat:join', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const conversation = await getConversationForUser({
        conversationId: payload.conversationId,
        userId,
        populate: true,
      });
      const messages = await getConversationMessages({
        conversationId: payload.conversationId,
        userId,
      });

      socket.join(conversationRoom(payload.conversationId));
      ackOk(ack, { conversation, messages });
    }));

    socket.on('chat:leave', ({ conversationId } = {}) => {
      if (conversationId) {
        socket.leave(conversationRoom(conversationId));
      }
    });

    socket.on('chat:createDm', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const participants = payload.participants || [];
      if (!participants.map(toId).includes(userId)) {
        throw makeSocketError('You must be a participant in the DM', 403);
      }

      const conversation = await createDmConversationForUsers(participants);
      emitConversationUpdated(io, conversation);
      ackOk(ack, { conversation });
    }));

    socket.on('chat:send', guarded(async (payload, ack) => {
      const senderId = resolveUserId(socket, payload.senderId);
      const result = await sendConversationMessage({
        conversationId: payload.conversationId,
        senderId,
        content: payload.content,
        type: payload.type || 'text',
      });

      emitMessageCreated(io, result);
      ackOk(ack, result);
    }));

    socket.on('chat:edit', guarded(async (payload, ack) => {
      const senderId = resolveUserId(socket, payload.senderId);
      const result = await editChatMessage({
        messageId: payload.messageId,
        senderId,
        content: payload.content,
      });

      emitMessageEdited(io, result);
      ackOk(ack, result);
    }));

    socket.on('chat:delete', guarded(async (payload, ack) => {
      const senderId = resolveUserId(socket, payload.senderId);
      const result = await deleteChatMessage({
        messageId: payload.messageId,
        senderId,
      });

      emitMessageDeleted(io, result);
      ackOk(ack, result);
    }));

    socket.on('chat:block', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const conversation = await setConversationBlocked({
        conversationId: payload.conversationId,
        userId,
        blocked: Boolean(payload.blocked),
      });

      emitConversationUpdated(io, conversation);
      ackOk(ack, { conversation });
    }));

    socket.on('group:join', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const { conversation, messages } = await getGroupMessagesForUser({
        groupId: payload.groupId,
        userId,
      });

      socket.join(conversationRoom(conversation._id));
      emitConversationUpdated(io, conversation);
      ackOk(ack, { conversation, messages });
    }));

    socket.on('group:send', guarded(async (payload, ack) => {
      const senderId = resolveUserId(socket, payload.senderId);
      const result = await sendGroupMessage({
        groupId: payload.groupId,
        senderId,
        content: payload.content,
        type: payload.type || 'text',
      });

      emitMessageCreated(io, result);
      ackOk(ack, result);
    }));

    socket.on('chat:typing', (payload = {}) => {
      if (!payload.conversationId) return;
      socket.to(conversationRoom(payload.conversationId)).emit('chat:typing', {
        conversationId: payload.conversationId,
        userId: socket.data.userId || payload.userId,
        isTyping: Boolean(payload.isTyping),
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.userId) {
        removeActiveSocket(io, socket.data.userId, socket.id).catch((error) => {
          console.error('Socket presence disconnect error:', error.message);
        });
      }
    });

    const readingRoomName = (groupId) => `reading_room:${groupId}`;

    socket.on('join_reading_room', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const snapshot = await handleSocketJoinRoom({
        groupId: payload.groupId,
        sessionId: payload.sessionId,
        userId,
        username: payload.username,
      });

      const roomGroupId = toId(snapshot?.groupId || payload.groupId || payload.sessionId);
      const room = readingRoomName(roomGroupId);
      socket.join(room);
      socket.data.readingRoom = room;
      ackOk(ack, { session: snapshot });

      io.to(room).emit('reader_joined', {
        sessionId: snapshot._id,
        groupId: roomGroupId,
        userId,
        username: payload.username || socket.data.username || socket.data.userId,
      });
    }));

    socket.on('leave_reading_room', ({ groupId, sessionId } = {}) => {
      const room = socket.data.readingRoom || readingRoomName(toId(groupId || sessionId));
      if (!room) return;

      socket.leave(room);
      socket.data.readingRoom = null;
      io.to(room).emit('reader_left', {
        groupId,
        sessionId,
        userId: socket.data.userId,
      });
    });

    socket.on('scroll_update', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const snapshot = await handleSocketPageUpdate({
        sessionId: payload.sessionId,
        userId,
        currentPage: payload.currentPage,
        username: payload.username,
      });

      const room = readingRoomName(toId(snapshot?.groupId || payload.groupId || payload.sessionId));
      io.to(room).emit('page_updated', {
        sessionId: snapshot._id,
        groupId: toId(snapshot?.groupId),
        userId,
        username: payload.username || socket.data.username || socket.data.userId,
        currentPage: payload.currentPage,
        session: snapshot,
      });

      ackOk(ack, { session: snapshot });
    }));

    socket.on('annotation_added', guarded(async (payload, ack) => {
      if (payload?.skipSave && payload.annotation) {
        const room = readingRoomName(toId(payload.groupId || payload.sessionId));
        io.to(room).emit('annotation_added', {
          sessionId: payload.sessionId,
          groupId: toId(payload.groupId),
          annotation: payload.annotation,
        });
        ackOk(ack, { annotation: payload.annotation });
        return;
      }

      const userId = resolveUserId(socket, payload.userId);
      const snapshot = await handleSocketReaction({
        sessionId: payload.sessionId,
        userId,
        page: payload.page,
        emoji: payload.emoji,
        note: payload.note,
        username: payload.username,
      });

      const room = readingRoomName(toId(snapshot?.groupId || payload.groupId || payload.sessionId));
      const annotation = snapshot.annotations[snapshot.annotations.length - 1];
      io.to(room).emit('annotation_added', {
        sessionId: snapshot._id,
        groupId: toId(snapshot?.groupId),
        annotation,
      });

      ackOk(ack, { session: snapshot, annotation });
    }));


    socket.on('reader_completed', guarded(async (payload, ack) => {
      const userId = resolveUserId(socket, payload.userId);
      const snapshot = await handleSocketReaderCompleted({
        sessionId: payload.sessionId,
        userId,
        currentPage: payload.currentPage,
        username: payload.username,
      });

      const room = readingRoomName(toId(snapshot?.groupId || payload.groupId || payload.sessionId));
      io.to(room).emit('reader_finished', {
        sessionId: snapshot._id,
        groupId: toId(snapshot?.groupId),
        userId,
        username: payload.username || socket.data.username || socket.data.userId,
      });

      ackOk(ack, { session: snapshot });
    }));

    socket.on('check_all_completed', guarded(async (payload, ack) => {
      const snapshot = await handleSocketCheckCompletion({ sessionId: payload.sessionId });
      const room = readingRoomName(toId(snapshot?.groupId || payload.groupId || payload.sessionId));

      if (snapshot?.status === 'completed') {
        io.to(room).emit('session_completed', {
          sessionId: snapshot._id,
          groupId: toId(snapshot?.groupId),
          session: snapshot,
        });
      }

      ackOk(ack, { session: snapshot });
    }));
  });

  return io;
};
