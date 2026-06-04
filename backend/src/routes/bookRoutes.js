import express from 'express';
import { searchBooks } from '../controllers/ReadingSessionController.js';

const router = express.Router();

router.get('/search', searchBooks);

export default router;