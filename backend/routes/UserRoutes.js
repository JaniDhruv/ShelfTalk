import express from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/UserController.js';

const router = express.Router();

// Create a new user
router.post('/', createUser);

// Get all users
router.get('/', getUsers);

// Get single user by ID
router.get('/:id', getUserById);

// Update user by ID
router.put('/:id', updateUser);

// Delete user by ID
router.delete('/:id', deleteUser);

export default router;
