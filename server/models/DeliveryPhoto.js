import mongoose from 'mongoose';

// A photo the owner took of a finished delivery (admin-only). Kept in its own collection so the
// image bytes never ride along with order queries. The client resizes + re-encodes before upload
// (which also strips EXIF/GPS), so each photo is a few hundred KB.
const deliveryPhotoSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true,
  },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true },
}, { timestamps: true });

export default mongoose.model('DeliveryPhoto', deliveryPhotoSchema);
