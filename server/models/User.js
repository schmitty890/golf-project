import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  firstName: {
    type: String,
    trim: true,
    default: '',
  },
  lastName: {
    type: String,
    trim: true,
    default: '',
  },
  profilePicture: {
    type: String,
    default: '',
  },
  // Saved contact + default delivery address, used to auto-fill the order form on future orders.
  // Address mirrors Order.deliveryAddress so prefill is a direct copy.
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    street: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: '' },
    neighborhood: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  },
  // Personal referral code (generated on demand). Sparse-unique so users without one don't clash.
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
  },
  // When this customer was last sent a lapsed win-back email. Guards the admin "email lapsed
  // customers" action against re-emailing the same person within a cooldown (routes/customers.js).
  winBackEmailedAt: { type: Date, default: null },
  // Newsletter opt-in (set via the Account toggle or the subscribe popup).
  newsletterSubscribed: { type: Boolean, default: false },
  newsletterSubscribedAt: { type: Date, default: null },
  // Unguessable token for one-click email unsubscribe (minted lazily when first emailed).
  unsubscribeToken: { type: String, index: true, default: '' },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
