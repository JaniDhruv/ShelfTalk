import express from 'express';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  approveJoin,
  declineJoin,
  inviteUser,
  respondInvite,
  addModerator,
  removeModerator
} from '../controllers/groupController.js';

const router = express.Router();

// CRUD routes
router.post('/', createGroup);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Membership routes
router.post('/:id/add-member', addMember);
router.post('/:id/remove-member', removeMember);
router.post('/:id/approve', approveJoin);
router.post('/:id/decline', declineJoin);
router.post('/:id/invite', inviteUser);
router.post('/:id/invite/respond', respondInvite);
router.post('/:id/add-moderator', addModerator);
router.post('/:id/remove-moderator', removeModerator);

export default router;
