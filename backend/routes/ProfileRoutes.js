import express from 'express';
import { getProfileByUserId, updateProfile, searchProfiles } from '../controllers/ProfileController.js';

const router = express.Router();

router.get('/search', searchProfiles);
router.get('/:id', getProfileByUserId);
router.put('/:id', updateProfile);

export default router;
