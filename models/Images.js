const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  userID: { type: mongoose.Schema.Types.ObjectId,  required: true },
  galleryID: { type: mongoose.Schema.Types.ObjectId,  required: true },
  url: { type: String, required: true },
  publicId: { type: String, required: true },
},{timestamps: true});

const Image = mongoose.model("Image", imageSchema);

module.exports = Image;
