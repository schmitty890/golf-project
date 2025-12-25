import express from 'express';
import Round from '../models/Round.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Hole:
 *       type: object
 *       properties:
 *         holeNumber:
 *           type: integer
 *           minimum: 1
 *           maximum: 18
 *         par:
 *           type: integer
 *           minimum: 3
 *           maximum: 5
 *     Player:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         scores:
 *           type: array
 *           items:
 *             type: integer
 *     Round:
 *       type: object
 *       required:
 *         - courseName
 *         - date
 *         - holes
 *         - players
 *       properties:
 *         _id:
 *           type: string
 *         courseName:
 *           type: string
 *         date:
 *           type: string
 *           format: date
 *         holes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Hole'
 *         players:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Player'
 *         createdBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/rounds:
 *   post:
 *     summary: Create a new round
 *     tags: [Rounds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseName
 *               - date
 *               - holes
 *               - players
 *             properties:
 *               courseName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               holes:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Hole'
 *               players:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Player'
 *     responses:
 *       201:
 *         description: Round created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      courseName, date, holes, players,
    } = req.body;

    const round = new Round({
      courseName,
      date,
      holes,
      players,
      createdBy: req.userId,
    });

    await round.save();

    return res.status(201).json({
      message: 'Round created successfully',
      data: round,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds:
 *   get:
 *     summary: Get all rounds for the authenticated user
 *     tags: [Rounds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rounds
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth, async (req, res) => {
  try {
    const rounds = await Round.find({ createdBy: req.userId }).sort({ date: -1 });
    return res.json(rounds);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds/{id}:
 *   get:
 *     summary: Get a single round by ID
 *     tags: [Rounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Round details
 *       404:
 *         description: Round not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const round = await Round.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    return res.json(round);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds/{id}:
 *   put:
 *     summary: Update a round (scores, players, etc.)
 *     tags: [Rounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               courseName:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               holes:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Hole'
 *               players:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Player'
 *     responses:
 *       200:
 *         description: Round updated successfully
 *       404:
 *         description: Round not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const round = await Round.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    const {
      courseName, date, holes, players,
    } = req.body;

    if (courseName) round.courseName = courseName;
    if (date) round.date = date;
    if (holes) round.holes = holes;
    if (players) round.players = players;

    await round.save();

    return res.json({
      message: 'Round updated successfully',
      data: round,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
