import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { listConversations, getConversationMessages, sendMessage, createDmConversation, blockConversation, unblockConversation, sendAttachment, editMessage, deleteMessage, createGroupConversation, getGroupMessages, sendGroupMessage } from '../controllers/ChatController.js';

const router = express.Router();

// Multer storage
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, `${unique}${ext}`);
	}
});
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
