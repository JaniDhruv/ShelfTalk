import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Group from '../models/Group.js';

export const createChatError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const toId = (value) => {
  if (!value) return '';
  return (value._id || value).toString();
};

const memberIds = (members = []) => members.map(toId);

const isConversationMember = (conversation, userId) => {
  return memberIds(conversation?.members).includes(userId?.toString());
};

const ensureContent = (content) => {
  if (typeof content !== 'string' || !content.trim()) {
    throw createChatError('Content is required', 400);
  }
  return content.trim();
};

export const populateConversation = async (conversation) => {
  if (!conversation) return null;
  return conversation.populate([
    {
      path: 'members',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' },
    },
    { path: 'group', select: 'name' },
    {
      path: 'lastSender',
      select: 'username profile',
      populate: { path: 'profile', select: 'fullName' },
    },
  ]);
};

export const listConversationsForUser = async (userId) => {
  if (!userId) throw createChatError('User id is required', 400);
  return Conversation.find({ members: userId })
    .populate({
      path: 'members',
      select: 'username email profile',
      populate: { path: 'profile', select: 'fullName isOnline lastSeen' },
    })
    .populate('group', 'name')
    .populate({
      path: 'lastSender',
      select: 'username profile',
      populate: { path: 'profile', select: 'fullName' },
    })
    .sort({ lastMessageAt: -1, updatedAt: -1 });
};

export const getConversationForUser = async ({ conversationId, userId, populate = false }) => {
  if (!conversationId) throw createChatError('Conversation id is required', 400);
  if (!userId) throw createChatError('User id is required', 400);

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw createChatError('Conversation not found', 404);
  if (!isConversationMember(conversation, userId)) {
    throw createChatError('Not authorized for this conversation', 403);
  }

  return populate ? populateConversation(conversation) : conversation;
};

export const getConversationMessages = async ({ conversationId, userId }) => {
  if (userId) {
    await getConversationForUser({ conversationId, userId });
  }

  return Message.find({ conversation: conversationId })
    .populate('sender', 'username')
    .sort({ createdAt: 1 });
};

const updateConversationSummary = async ({ conversationId, lastMessage, lastMessageAt, lastMessageType, lastSender }) => {
  const conversation = await Conversation.findByIdAndUpdate(
    conversationId,
    {
      lastMessage,
      lastMessageAt,
      lastMessageType,
      lastSender,
    },
    { new: true }
  );
  return populateConversation(conversation);
};

const latestSummaryText = (message) => {
  if (!message) return '';
  if (message.type === 'image') return 'Photo';
  if (message.type === 'file') return message.fileName || message.content;
  return message.content;
};

export const refreshConversationSummary = async (conversationId) => {
  const latest = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 });

  if (!latest) {
    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: '',
        lastMessageAt: null,
        lastMessageType: 'text',
        lastSender: null,
      },
      { new: true }
    );
    return populateConversation(conversation);
  }

  return updateConversationSummary({
    conversationId,
    lastMessage: latestSummaryText(latest),
    lastMessageAt: latest.createdAt,
    lastMessageType: latest.type,
    lastSender: latest.sender,
  });
};

const createMessageForConversation = async ({
  conversation,
  senderId,
  content,
  type = 'text',
  fileName,
  lastMessage,
}) => {
  if (!senderId) throw createChatError('Sender id is required', 400);
  if (!isConversationMember(conversation, senderId)) {
    throw createChatError('Not authorized for this conversation', 403);
  }
  if (conversation.blockedBy?.length) {
    throw createChatError('Conversation is blocked', 403);
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    content,
    type,
    fileName,
    readBy: [senderId],
  });

  const updatedConversation = await updateConversationSummary({
    conversationId: conversation._id,
    lastMessage: lastMessage || latestSummaryText(message),
    lastMessageAt: message.createdAt,
    lastMessageType: type,
    lastSender: senderId,
  });

  await message.populate('sender', 'username');
  return { message, conversation: updatedConversation };
};

export const sendConversationMessage = async ({ conversationId, senderId, content, type = 'text' }) => {
  const trimmedContent = ensureContent(content);
  const conversation = await getConversationForUser({ conversationId, userId: senderId });
  return createMessageForConversation({
    conversation,
    senderId,
    content: trimmedContent,
    type,
  });
};

export const sendConversationAttachment = async ({
  conversationId,
  senderId,
  content,
  type,
  fileName,
}) => {
  const conversation = await getConversationForUser({ conversationId, userId: senderId });
  return createMessageForConversation({
    conversation,
    senderId,
    content,
    type,
    fileName,
    lastMessage: type === 'image' ? 'Photo' : fileName,
  });
};

export const createDmConversationForUsers = async (participants) => {
  if (!participants || participants.length !== 2) {
    throw createChatError('Exactly 2 participants required for DM', 400);
  }

  const [userA, userB] = participants;
  let conversation = await Conversation.findOne({
    type: 'dm',
    members: { $all: [userA, userB], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      type: 'dm',
      members: [userA, userB],
    });
  }

  return populateConversation(conversation);
};

export const setConversationBlocked = async ({ conversationId, userId, blocked }) => {
  const conversation = await getConversationForUser({ conversationId, userId });
  const alreadyBlocked = (conversation.blockedBy || []).some((id) => toId(id) === userId);

  if (blocked && !alreadyBlocked) {
    conversation.blockedBy.push(userId);
  }

  if (!blocked) {
    conversation.blockedBy = (conversation.blockedBy || []).filter((id) => toId(id) !== userId);
  }

  await conversation.save();
  return populateConversation(conversation);
};

export const createGroupConversationForUser = async ({ groupId, userId }) => {
  if (!groupId) throw createChatError('Group id is required', 400);
  if (!userId) throw createChatError('User id is required', 400);

  const group = await Group.findById(groupId).populate('members', 'username');
  if (!group) throw createChatError('Group not found', 404);

  const ids = memberIds(group.members);
  if (!ids.includes(userId.toString())) {
    throw createChatError('You must be a member to access group chat', 403);
  }

  let conversation = await Conversation.findOne({
    type: 'group',
    group: groupId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      type: 'group',
      name: `${group.name} Chat`,
      members: ids,
      group: groupId,
    });
  } else {
    conversation.members = ids;
    conversation.name = conversation.name || `${group.name} Chat`;
    await conversation.save();
  }

  return populateConversation(conversation);
};

export const getGroupMessagesForUser = async ({ groupId, userId }) => {
  const conversation = await createGroupConversationForUser({ groupId, userId });
  const messages = await getConversationMessages({
    conversationId: conversation._id,
    userId,
  });
  return { conversation, messages };
};

export const sendGroupMessage = async ({ groupId, senderId, content, type = 'text' }) => {
  const trimmedContent = ensureContent(content);
  const conversation = await createGroupConversationForUser({ groupId, userId: senderId });
  return createMessageForConversation({
    conversation,
    senderId,
    content: trimmedContent,
    type,
  });
};

export const editChatMessage = async ({ messageId, senderId, content }) => {
  const trimmedContent = ensureContent(content);
  if (!senderId) throw createChatError('SenderId is required', 400);

  const message = await Message.findById(messageId);
  if (!message) throw createChatError('Message not found', 404);
  if (toId(message.sender) !== senderId.toString()) {
    throw createChatError('You can only edit your own messages', 403);
  }
  if (message.type !== 'text') {
    throw createChatError('Only text messages can be edited', 400);
  }

  message.content = trimmedContent;
  await message.save();
  await message.populate('sender', 'username');

  let conversation = null;
  const latest = await Message.findOne({ conversation: message.conversation }).sort({ createdAt: -1 });
  if (latest && toId(latest._id) === toId(message._id)) {
    conversation = await updateConversationSummary({
      conversationId: message.conversation,
      lastMessage: trimmedContent,
      lastMessageAt: message.createdAt,
      lastMessageType: message.type,
      lastSender: message.sender,
    });
  }

  return {
    message,
    conversationId: toId(message.conversation),
    conversation,
  };
};

export const deleteChatMessage = async ({ messageId, senderId }) => {
  if (!senderId) throw createChatError('SenderId is required', 400);

  const message = await Message.findById(messageId);
  if (!message) throw createChatError('Message not found', 404);
  if (toId(message.sender) !== senderId.toString()) {
    throw createChatError('You can only delete your own messages', 403);
  }

  const conversationId = toId(message.conversation);
  await Message.findByIdAndDelete(messageId);
  const conversation = await refreshConversationSummary(conversationId);

  return {
    messageId,
    conversationId,
    conversation,
  };
};
