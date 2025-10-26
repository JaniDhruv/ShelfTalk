import express from 'express';
import { getProfileByUserId, updateProfile, searchProfiles, setOnlineStatus } from '../controllers/ProfileController.js';

const router = express.Router();

router.get('/search', searchProfiles);
router.get('/:id', getProfileByUserId);
router.put('/:id', updateProfile);
router.patch('/:id/status', setOnlineStatus);

export default router;
