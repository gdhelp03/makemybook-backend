const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({
    userID: { type: mongoose.Schema.Types.ObjectId, required: true },
    slug:{ type: String, required: true, },
    name: { type: String, required: true, },
    path: { type: String, required: true, },
    external_id: { type: String, required: true, },
  },{timestamps: true});

const Gallery = mongoose.model("Gallery", gallerySchema);

module.exports = Gallery;
