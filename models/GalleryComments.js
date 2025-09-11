const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommentSchema = new Schema(
  {
    galleryId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    author: {
      name: { type: String, trim: true },
      avatar: { type: String, trim: true },
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
      index: true,
    },

    editedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Fast fetch newest-first within a gallery
CommentSchema.index({ galleryId: 1, createdAt: -1 });
// Helpful for id-based pagination if you use it
CommentSchema.index({ galleryId: 1, _id: -1 });

module.exports = mongoose.model("GalleryComment", CommentSchema);
