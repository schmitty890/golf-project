import express from 'express';
import StringModel from '../models/String.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     String:
 *       type: object
 *       required:
 *         - value
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ID
 *         value:
 *           type: string
 *           description: The string value
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *       example:
 *         _id: 507f1f77bcf86cd799439011
 *         value: Hello World
 *         createdAt: 2023-11-23T12:00:00.000Z
 */

/**
 * @swagger
 * /api/strings:
 *   post:
 *     summary: Create a new string
 *     tags: [Strings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: string
 *                 description: The string value to save
 *             example:
 *               value: Hello World
 *     responses:
 *       201:
 *         description: String created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/String'
 *       400:
 *         description: Bad request - value is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'String value is required' });
    }
    const newString = new StringModel({ value });
    await newString.save();

    return res.status(201).json({
      message: 'String saved successfully',
      data: newString,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/strings:
 *   get:
 *     summary: Get all strings
 *     tags: [Strings]
 *     responses:
 *       200:
 *         description: List of all strings sorted by creation date (newest first)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/String'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const strings = await StringModel.find().sort({ createdAt: -1 });
    res.json(strings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
