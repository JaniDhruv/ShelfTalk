import express from 'express';
import { getDiaryRange, getDiarySummary } from '../controllers/DiaryController.js';

const router = express.Router();

// Get aggregated daily reading life
router.get('/:userId/range', getDiaryRange);

// Get inside cover summary
router.get('/:userId/summary', getDiarySummary);

export default router;
