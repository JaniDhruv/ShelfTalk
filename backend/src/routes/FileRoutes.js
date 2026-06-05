import express from 'express';
import { streamFileFromGridFS } from '../utils/gridfs.js';

const router = express.Router();

/**
 * Route to serve files stored in GridFS
 * Matches both /uploads/:filename and /uploads/library/:filename
 */

router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  streamFileFromGridFS(filename, res);
});

router.get('/library/:filename', (req, res) => {
  const { filename } = req.params;
  streamFileFromGridFS(filename, res);
});

export default router;
