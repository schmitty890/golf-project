import mongoose from 'mongoose';

// A newsletter send. Because Gmail caps sends per 24h, a campaign goes out in daily batches;
// `sentTo` records the users already emailed so re-running "send next batch" never double-sends.
const newsletterCampaignSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true },
  heading: { type: String, trim: true, default: '' },
  body: { type: String, required: true },
  status: { type: String, enum: ['sending', 'done'], default: 'sending' },
  sentTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  lastBatchAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('NewsletterCampaign', newsletterCampaignSchema);
