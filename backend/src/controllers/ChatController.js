import path from 'path';
import {
  createDmConversationForUsers,
  createGroupConversationForUser,
  deleteChatMessage,
  editChatMessage,
  getConversationMessages as getConversationMessagesService,
  getGroupMessagesForUser,
  listConversationsForUser,
  sendConversationAttachment,
  sendConversationMessage,
  sendGroupMessage as sendGroupMessageService,
  setConversationBlocked,
} from '../services/chatService.js';
import {
  emitConversationUpdated,
  emitMessageCreated,
  emitMessageDeleted,
  emitMessageEdited,
} from '../socket/chatEvents.js';
import { uploadFileToGridFS } from '../utils/gridfs.js';

const sendError = (res, error, fallbackStatus = 400) => {
  res.status(error?.status || fallbackStatus).json({
    message: error?.message || 'Unexpected chat error',
    error: error?.message,
  });
};

const getIo = (req) => req.app.get('io');

export const listConversations = async (req, res) => {
  try {
    const conversations = await listConversationsForUser(req.params.userId);
    res.json(conversations);
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await getConversationMessagesService({
      conversationId,
      userId: req.query.userId,
    });
    res.json(messages);
  } catch (error) {
    sendError(res, error, 500);
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { senderId, content, type } = req.body;
    console.log('[DEBUG sendMessage]', { conversationId, senderId, contentLength: content?.length, type });
    const result = await sendConversationMessage({
      conversationId,
      senderId,
      content,
      type: type || 'text',
    });

    emitMessageCreated(getIo(req), result);
    res.status(201).json(result.message);
  } catch (error) {
    console.error('[DEBUG sendMessage ERROR]', error.message, error.status);
    sendError(res, error);
  }
};

export const sendAttachment = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { senderId } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    
    // Save to GridFS
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${unique}${ext}`;
    await uploadFileToGridFS(file.buffer, filename, file.mimetype);

    const result = await sendConversationAttachment({
      conversationId,
      senderId,
      content: `/uploads/${filename}`,
      type: isImage ? 'image' : 'file',
      fileName: file.originalname,
    });

    emitMessageCreated(getIo(req), result);
    res.status(201).json(result.message);
  } catch (error) {
    sendError(res, error);
  }
};

export const createDmConversation = async (req, res) => {
  try {
    const { participants } = req.body;
    const conversation = await createDmConversationForUsers(participants);
    emitConversationUpdated(getIo(req), conversation);
    res.status(201).json(conversation);
  } catch (error) {
    sendError(res, error);
  }
};

export const blockConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const conversation = await setConversationBlocked({
      conversationId,
      userId,
      blocked: true,
    });

    emitConversationUpdated(getIo(req), conversation);
    res.json(conversation);
  } catch (error) {
    sendError(res, error);
  }
};

export const unblockConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const conversation = await setConversationBlocked({
      conversationId,
      userId,
      blocked: false,
    });

    emitConversationUpdated(getIo(req), conversation);
    res.json(conversation);
  } catch (error) {
    sendError(res, error);
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, senderId } = req.body;
    const result = await editChatMessage({ messageId, senderId, content });

    emitMessageEdited(getIo(req), result);
    res.status(200).json({
      success: true,
      data: result.message,
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Error editing message',
      error: error?.message,
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { senderId } = req.body;
    const result = await deleteChatMessage({ messageId, senderId });

    emitMessageDeleted(getIo(req), result);
    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Error deleting message',
      error: error?.message,
    });
  }
};

export const createGroupConversation = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const conversation = await createGroupConversationForUser({ groupId, userId });

    emitConversationUpdated(getIo(req), conversation);
    res.status(200).json(conversation);
  } catch (error) {
    console.error('Create group conversation error:', error);
    sendError(res, error, 500);
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.query;
    const { messages } = await getGroupMessagesForUser({ groupId, userId });
    res.json(messages);
  } catch (error) {
    console.error('Get group messages error:', error);
    sendError(res, error, 500);
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { senderId, content, type = 'text' } = req.body;
    const result = await sendGroupMessageService({
      groupId,
      senderId,
      content,
      type,
    });

    emitMessageCreated(getIo(req), result);
    res.status(201).json(result.message);
  } catch (error) {
    console.error('Send group message error:', error);
    sendError(res, error, 500);
  }
};
