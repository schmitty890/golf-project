import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import sharp from 'sharp';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { sendMail } from '../utils/mailer.js';
import { ownerNoticeEmail } from '../utils/orderEmails.js';

const router = express.Router();

const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || (u?.email || 'Customer');

// Fire-and-forget owner alert (no-op if OWNER_EMAIL/SMTP unset; never blocks the request).
function notifyOwner(notice) {
  if (!process.env.OWNER_EMAIL) return;
  sendMail({ to: process.env.OWNER_EMAIL, ...ownerNoticeEmail(notice) });
}

// Configure multer for avatar uploads (memory storage for processing)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, gif) are allowed'));
    }
  },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: User's password (min 6 characters)
 *       example:
 *         email: user@example.com
 *         password: password123
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({ email, password });
    await user.save();

    notifyOwner({
      subject: `New customer sign-up: ${user.email}`,
      heading: 'New customer sign-up',
      intro: `${user.email} just created an account.`,
      lines: [['Email', user.email]],
    });

    // Generate JWT token (no expiry — users stay logged in until manual logout)
    const token = jwt.sign(
      // eslint-disable-next-line no-underscore-dangle
      { userId: user._id },
      process.env.JWT_SECRET,
    );

    return res.status(201).json({
      token,
      user: {
        // eslint-disable-next-line no-underscore-dangle
        id: user._id,
        email: user.email,
        role: user.role,
        newsletterSubscribed: user.newsletterSubscribed,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({
      error: 'Server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with existing credentials
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token (no expiry — users stay logged in until manual logout)
    const token = jwt.sign(
      // eslint-disable-next-line no-underscore-dangle
      { userId: user._id },
      process.env.JWT_SECRET,
    );

    return res.json({
      token,
      user: {
        // eslint-disable-next-line no-underscore-dangle
        id: user._id,
        email: user.email,
        role: user.role,
        newsletterSubscribed: user.newsletterSubscribed,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Server error during login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      // eslint-disable-next-line no-underscore-dangle
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      phone: user.phone,
      address: user.address,
      role: user.role,
      newsletterSubscribed: user.newsletterSubscribed,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile (firstName, lastName)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      firstName, lastName, phone, address, newsletterSubscribed,
    } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Track which fields the customer actually changed, so the owner alert is specific.
    const changes = [];
    if (firstName !== undefined && firstName !== user.firstName) changes.push('Name');
    if (lastName !== undefined && lastName !== user.lastName) changes.push('Name');
    if (phone !== undefined && String(phone).trim() !== (user.phone || '')) changes.push('Phone');
    const nlChanged = newsletterSubscribed !== undefined
      && !!newsletterSubscribed !== user.newsletterSubscribed;
    if (nlChanged) {
      changes.push(newsletterSubscribed ? 'Newsletter (subscribed)' : 'Newsletter (unsubscribed)');
    }

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = String(phone).trim();
    if (newsletterSubscribed !== undefined) {
      user.newsletterSubscribed = !!newsletterSubscribed;
      user.newsletterSubscribedAt = newsletterSubscribed ? new Date() : null;
    }
    if (address && typeof address === 'object') {
      // Merge only the provided address fields so a partial update doesn't blank the rest.
      ['street', 'unit', 'neighborhood', 'notes'].forEach((k) => {
        if (address[k] !== undefined && String(address[k]).trim() !== (user.address[k] || '')) {
          changes.push('Address');
        }
        if (address[k] !== undefined) user.address[k] = String(address[k]).trim();
      });
    }
    await user.save();

    if (changes.length) {
      const what = [...new Set(changes)].join(', ');
      const addr = [user.address?.street, user.address?.unit, user.address?.neighborhood]
        .filter(Boolean).join(', ');
      notifyOwner({
        subject: `Customer updated their profile: ${fullName(user)}`,
        heading: 'Customer updated their profile',
        intro: `${fullName(user)} changed: ${what}.`,
        lines: [
          ['Name', fullName(user)],
          ['Email', user.email || '—'],
          ['Phone', user.phone || '—'],
          ['Address', addr || '—'],
        ],
      });
    }

    return res.json({
      // eslint-disable-next-line no-underscore-dangle
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      phone: user.phone,
      address: user.address,
      role: user.role,
      newsletterSubscribed: user.newsletterSubscribed,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/avatar:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *       401:
 *         description: Unauthorized
 */
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Resize and compress image to 200x200 JPEG
    const compressedBuffer = await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Convert to Base64 data URI and save to user
    const base64 = compressedBuffer.toString('base64');
    user.profilePicture = `data:image/jpeg;base64,${base64}`;
    await user.save();

    return res.json({
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/avatar:
 *   delete:
 *     summary: Remove profile picture
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar removed
 *       401:
 *         description: Unauthorized
 */
router.delete('/avatar', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.profilePicture = '';
    await user.save();

    return res.json({ message: 'Avatar removed' });
  } catch (error) {
    console.error('Remove avatar error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/password:
 *   put:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid current password or weak new password
 *       401:
 *         description: Unauthorized
 */
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @swagger
 * /api/auth/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deleted
 *       400:
 *         description: Invalid password
 *       401:
 *         description: Unauthorized
 */
router.delete('/account', auth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Delete user
    await User.findByIdAndDelete(req.userId);

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
