import express from 'express';
import Round from '../models/Round.js';
import auth from '../middleware/auth.js';
import generateCode from '../utils/generateCode.js';
import { emitScoreUpdate, emitPlayerJoined, emitPlayerRemoved } from '../socket.js';

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

    // Generate unique share code
    let shareCode;
    let isUnique = false;
    while (!isUnique) {
      shareCode = generateCode();
      // eslint-disable-next-line no-await-in-loop
      const existing = await Round.findOne({ shareCode });
      if (!existing) isUnique = true;
    }

    const round = new Round({
      courseName,
      date,
      holes,
      players,
      createdBy: req.userId,
      shareCode,
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
    // Find rounds where user is creator OR a participant
    const rounds = await Round.find({
      $or: [
        { createdBy: req.userId },
        { 'players.userId': req.userId },
      ],
    }).sort({ date: -1 });
    return res.json(rounds);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds/lookup/{shareCode}:
 *   get:
 *     summary: Look up a round by share code (for joining)
 *     tags: [Rounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shareCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The 6-character share code
 *     responses:
 *       200:
 *         description: Round details
 *       404:
 *         description: Invalid share code
 *       401:
 *         description: Unauthorized
 */
router.get('/lookup/:shareCode', auth, async (req, res) => {
  try {
    const round = await Round.findOne({
      shareCode: req.params.shareCode.toUpperCase(),
    });
    if (!round) {
      return res.status(404).json({ error: 'Invalid share code' });
    }
    return res.json(round);
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
    // Allow access if user is creator OR participant
    const round = await Round.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.userId },
        { 'players.userId': req.userId },
      ],
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

/**
 * @swagger
 * /api/rounds/{id}/share:
 *   post:
 *     summary: Generate a share code for a round (admin only)
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
 *         description: Share code generated
 *       403:
 *         description: Not authorized (not the creator)
 *       404:
 *         description: Round not found
 */
router.post('/:id/share', auth, async (req, res) => {
  try {
    const round = await Round.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found or not authorized' });
    }

    // Generate unique code if not already set
    if (!round.shareCode) {
      let code;
      let isUnique = false;

      while (!isUnique) {
        code = generateCode();
        // eslint-disable-next-line no-await-in-loop
        const existing = await Round.findOne({ shareCode: code });
        if (!existing) isUnique = true;
      }

      round.shareCode = code;
      await round.save();
    }

    return res.json({
      message: 'Share code generated',
      shareCode: round.shareCode,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds/join:
 *   post:
 *     summary: Join a round using a share code
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
 *               - shareCode
 *               - playerIndex
 *             properties:
 *               shareCode:
 *                 type: string
 *               playerIndex:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Joined round successfully
 *       400:
 *         description: Invalid request or slot already claimed
 *       404:
 *         description: Round not found
 */
router.post('/join', auth, async (req, res) => {
  try {
    const { shareCode, playerIndex } = req.body;

    if (!shareCode || playerIndex === undefined) {
      return res.status(400).json({ error: 'Share code and player index required' });
    }

    const round = await Round.findOne({ shareCode: shareCode.toUpperCase() });

    if (!round) {
      return res.status(404).json({ error: 'Invalid share code' });
    }

    // Check if player index is valid
    if (playerIndex < 0 || playerIndex >= round.players.length) {
      return res.status(400).json({ error: 'Invalid player slot' });
    }

    // Check if slot is already claimed by someone else
    const player = round.players[playerIndex];
    if (player.userId && player.userId.toString() !== req.userId) {
      return res.status(400).json({ error: 'This slot is already claimed' });
    }

    // Check if user already has a slot in this round
    const existingSlot = round.players.findIndex(
      // eslint-disable-next-line no-underscore-dangle
      (p) => p.userId && p.userId.toString() === req.userId,
    );
    if (existingSlot !== -1 && existingSlot !== playerIndex) {
      return res.status(400).json({ error: 'You already have a slot in this round' });
    }

    // Claim the slot
    round.players[playerIndex].userId = req.userId;
    await round.save();

    // Emit real-time update to all clients in this round's room
    // eslint-disable-next-line no-underscore-dangle
    emitPlayerJoined(round._id.toString(), {
      playerIndex,
      userId: req.userId,
      playerName: round.players[playerIndex].name,
    });

    return res.json({
      message: 'Joined round successfully',
      data: round,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds/{id}/score:
 *   put:
 *     summary: Update a single score (participant can only update their own)
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
 *             required:
 *               - playerIndex
 *               - holeIndex
 *               - score
 *             properties:
 *               playerIndex:
 *                 type: integer
 *               holeIndex:
 *                 type: integer
 *               score:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Score updated
 *       403:
 *         description: Not authorized to update this score
 *       404:
 *         description: Round not found
 */
router.put('/:id/score', auth, async (req, res) => {
  try {
    const { playerIndex, holeIndex, score } = req.body;

    // Find round where user is creator OR participant
    const round = await Round.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.userId },
        { 'players.userId': req.userId },
      ],
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }

    // Check permissions: admin can edit any, participant only their own
    // eslint-disable-next-line no-underscore-dangle
    const isAdmin = round.createdBy.toString() === req.userId;
    const player = round.players[playerIndex];

    if (!player) {
      return res.status(400).json({ error: 'Invalid player index' });
    }

    // If not admin, must be editing their own slot
    if (!isAdmin && (!player.userId || player.userId.toString() !== req.userId)) {
      return res.status(403).json({ error: 'Not authorized to update this score' });
    }

    // Validate hole index
    if (holeIndex < 0 || holeIndex >= round.holes.length) {
      return res.status(400).json({ error: 'Invalid hole index' });
    }

    // Ensure scores array is long enough
    while (round.players[playerIndex].scores.length <= holeIndex) {
      round.players[playerIndex].scores.push(0);
    }

    // Update the score
    round.players[playerIndex].scores[holeIndex] = parseInt(score, 10) || 0;
    await round.save();

    // Emit real-time update to all clients in this round's room
    emitScoreUpdate(req.params.id, {
      playerIndex,
      holeIndex,
      score: round.players[playerIndex].scores[holeIndex],
    });

    return res.json({
      message: 'Score updated',
      data: {
        playerIndex,
        holeIndex,
        score: round.players[playerIndex].scores[holeIndex],
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds/{id}/players/{playerIndex}:
 *   delete:
 *     summary: Remove a player from round (admin only)
 *     tags: [Rounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: playerIndex
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Player removed
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Round not found
 */
router.delete('/:id/players/:playerIndex', auth, async (req, res) => {
  try {
    const round = await Round.findOne({
      _id: req.params.id,
      createdBy: req.userId,
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found or not authorized' });
    }

    const playerIndex = parseInt(req.params.playerIndex, 10);

    if (playerIndex < 0 || playerIndex >= round.players.length) {
      return res.status(400).json({ error: 'Invalid player index' });
    }

    // Clear the userId to "unclaim" the slot (keep the player name/scores)
    round.players[playerIndex].userId = null;
    await round.save();

    // Emit real-time update to all clients in this round's room
    emitPlayerRemoved(req.params.id, { playerIndex });

    return res.json({
      message: 'Player removed from round',
      data: round,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/rounds/{id}:
 *   delete:
 *     summary: Delete a round (creator only)
 *     tags: [Rounds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Round ID
 *     responses:
 *       200:
 *         description: Round deleted successfully
 *       404:
 *         description: Round not found or not authorized
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const round = await Round.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.userId,
    });

    if (!round) {
      return res.status(404).json({ error: 'Round not found or not authorized' });
    }

    return res.json({ message: 'Round deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
