import express from 'express';
import { discoverUsers, discoverClubs, discoverChallenges } from '../controllers/DiscoveryController.js';

const router = express.Router();

router.get('/users', discoverUsers);
router.get('/clubs', discoverClubs);
router.get('/challenges', discoverChallenges);

export default router;
