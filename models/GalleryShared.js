const mongoose = require("mongoose");

const galleryShareSchema = new mongoose.Schema(
  {
    galleryID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    can_read: {
      type: Boolean,
      default: false,
    },
    can_add: {
      type: Boolean,
      default: false,
    },
    can_update: {
      type: Boolean,
      default: false,
    },
    can_delete: {
      type: Boolean,
      default: false,
    },
    sharedUserID: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
    },
    sharedUserEmailID: {
      type: String,
      required: true,
    },
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const GalleryShare = mongoose.model("GalleryShare", galleryShareSchema);

module.exports = GalleryShare;
