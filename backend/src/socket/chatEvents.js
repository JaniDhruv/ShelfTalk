const toId = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

export const conversationRoom = (conversationId) => `conversation:${conversationId}`;
export const userRoom = (userId) => `user:${userId}`;

const conversationIdFromMessage = (message) => toId(message?.conversation);

const conversationMemberIds = (conversation) => {
  return (conversation?.members || []).map(toId).filter(Boolean);
};

export const emitConversationUpdated = (io, conversation) => {
  if (!io || !conversation?._id) return;

  let target = io.to(conversationRoom(conversation._id));
  for (const memberId of conversationMemberIds(conversation)) {
    target = target.to(userRoom(memberId));
  }
  target.emit('chat:conversationUpdated', conversation);
};

export const emitMessageCreated = (io, { message, conversation }) => {
  const conversationId = conversationIdFromMessage(message) || toId(conversation?._id);
  if (!io || !conversationId) return;

  io.to(conversationRoom(conversationId)).emit('chat:messageCreated', message);
  emitConversationUpdated(io, conversation);
};

export const emitMessageEdited = (io, { message, conversationId, conversation }) => {
  const targetConversationId = conversationId || conversationIdFromMessage(message);
  if (!io || !targetConversationId) return;

  io.to(conversationRoom(targetConversationId)).emit('chat:messageEdited', message);
  emitConversationUpdated(io, conversation);
};

export const emitMessageDeleted = (io, { messageId, conversationId, conversation }) => {
  if (!io || !conversationId) return;

  io.to(conversationRoom(conversationId)).emit('chat:messageDeleted', {
    messageId,
    conversationId,
  });
  emitConversationUpdated(io, conversation);
};
