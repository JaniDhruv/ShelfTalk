import mongoose from 'mongoose';
import { Readable } from 'stream';

/**
 * Returns the GridFS bucket instance
 */
export const getGridFSBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('Database connection is not established yet.');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads',
  });
};

/**
 * Uploads a buffer to GridFS
 * @param {Buffer} buffer - The file buffer
 * @param {string} filename - The filename to save as
 * @param {string} mimetype - The content type of the file
 * @returns {Promise<mongoose.mongo.ObjectId>} The GridFS file ID
 */
export const uploadFileToGridFS = (buffer, filename, mimetype) => {
  return new Promise((resolve, reject) => {
    try {
      const bucket = getGridFSBucket();
      const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimetype,
      });

      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      readableStream
        .pipe(uploadStream)
        .on('error', (error) => {
          reject(error);
        })
        .on('finish', () => {
          resolve(uploadStream.id);
        });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Deletes a file from GridFS by filename
 * @param {string} filename - The filename to delete
 */
export const deleteFileFromGridFS = async (filename) => {
  try {
    const bucket = getGridFSBucket();
    const files = await bucket.find({ filename }).toArray();
    if (files.length === 0) {
      return;
    }
    // Delete all matching files (in case of duplicates)
    for (const file of files) {
      await bucket.delete(file._id);
    }
  } catch (error) {
    console.error(`Error deleting file ${filename} from GridFS:`, error);
    throw error;
  }
};

/**
 * Streams a file from GridFS to the provided Express response object
 * @param {string} filename - The filename to stream
 * @param {import('express').Response} res - The Express response object
 */
export const streamFileFromGridFS = async (filename, res) => {
  try {
    const bucket = getGridFSBucket();
    const files = await bucket.find({ filename }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = files[0];
    if (file.contentType) {
      res.set('Content-Type', file.contentType);
    }
    res.set('Content-Length', file.length);
    res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    const downloadStream = bucket.openDownloadStreamByName(filename);
    
    downloadStream.on('error', (error) => {
      console.error(`Error streaming file ${filename}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error(`Error streaming file ${filename} from GridFS:`, error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error streaming file' });
    }
  }
};
