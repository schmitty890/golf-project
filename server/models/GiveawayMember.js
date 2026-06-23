import mongoose from 'mongoose';

// Standing "monthly free-bundle drawing" list. A customer joins once and stays entered each month
// while it runs; `active:false` = opted out. One membership per user (unique).
const giveawayMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true,
  },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('GiveawayMember', giveawayMemberSchema);
