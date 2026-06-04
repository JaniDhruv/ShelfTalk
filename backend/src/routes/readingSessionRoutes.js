import express from 'express';
import {
  createSession,
  getSessionByGroup,
  joinSession,
  updatePage,
  addReaction,
  getVisibleReactions,
  cancelSession,
} from '../controllers/ReadingSessionController.js';


const router = express.Router();

router.post('/create', createSession);
router.get('/group/:groupId', getSessionByGroup);
router.post('/:sessionId/join', joinSession);
router.patch('/:sessionId/page', updatePage);
router.post('/:sessionId/reaction', addReaction);
router.get('/:sessionId/reactions/:page', getVisibleReactions);
router.patch('/:sessionId/cancel', cancelSession);


export default router;