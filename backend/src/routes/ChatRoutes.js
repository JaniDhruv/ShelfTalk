import express from 'express';
import multer from 'multer';
import path from 'path';
import { listConversations, getConversationMessages, sendMessage, createDmConversation, blockConversation, unblockConversation, sendAttachment, editMessage, deleteMessage, createGroupConversation, getGroupMessages, sendGroupMessage } from '../controllers/ChatController.js';

const router = express.Router();

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/conversations/:userId', listConversations);
router.post('/conversations/dm', createDmConversation);
router.post('/conversations/:conversationId/block', blockConversation);
router.post('/conversations/:conversationId/unblock', unblockConversation);
router.get('/messages/:conversationId', getConversationMessages);
router.post('/messages/:conversationId', sendMessage);
router.post('/messages/:conversationId/attachment', upload.single('file'), sendAttachment);
router.put('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);

// Group chat routes
router.post('/groups/:groupId/conversation', createGroupConversation);
router.get('/groups/:groupId/messages', getGroupMessages);
router.post('/groups/:groupId/messages', sendGroupMessage);

export default router;
