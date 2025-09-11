const mongoose = require("mongoose");
require("dotenv").config();
const GalleryShare = require("../models/GalleryShared");
const Customer = require("../models/Customer");
const Gallery = require("../models/Gallery");


const getSharedGalleryByUser = async (req, res) => {
  try {
    const userID = req.user._id;
    const { galleryName } = req.body;
    const gallery = await Gallery.findOne({
      userID: userID,
      slug: galleryName,
    });

    if (!gallery) {
      return res.status(404).json({ success: false, message: "Gallery not found." });
    }
    const galleryID = gallery._id;

    const shares = await GalleryShare.find({
      userID: userID,
      galleryID: galleryID,
    });

    res.json({ success: true, data: shares });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addGallerySharingUser = async (req, res) => {
  try {
    console.log("req", req.user, req.body)
    const { galleryName, can_read, can_add, can_update, can_delete, sharedUserEmailID } = req.body;
    const userID = req.user._id;

    // const regex = new RegExp(`^${galleryName}(\\s\\d+)?$`, "i");
    const gallery = await Gallery.findOne({
      userID: userID,
      slug: galleryName,
    });

    if (!gallery) {
      return res.status(404).json({ success: false, message: "Gallery not found." });
    }
    const galleryID = gallery._id;

    // 2. Check if the shared email is a registered user
    const sharedUser = await Customer.findOne({ email: sharedUserEmailID });
    const sharedUserID = sharedUser ? sharedUser._id : null;

    // 3. Check for duplicate sharing entry
    const existingShare = await GalleryShare.findOne({
      galleryID,
      userID,
      sharedUserEmailID
    });

    if (existingShare) {
      return res.status(400).json({ success: false, message: "This gallery is already shared with this email." });
    }

    // 4. Create new share entry
    const newShare = new GalleryShare({
      galleryID,
      can_read,
      can_add,
      can_update,
      can_delete,
      sharedUserID,
      sharedUserEmailID,
      userID
    });

    const savedShare = await newShare.save();
    console.log("savedShare:", savedShare);

    res.status(201).json({ success: true, data: savedShare });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateGalleryShare = async (req, res) => {
  try {
    const update = req.body;
    const updatedShare = await GalleryShare.findByIdAndUpdate(update._id, update, {
      new: true,
    });

    if (!updatedShare) {
      return res.status(404).json({ success: false, message: "Share entry not found" });
    }

    res.json({ success: true, data: updatedShare });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Delete a sharing entry
const deleteGalleryShare = async (req, res) => {
  try {
    const update = req.body;

    const deletedShare = await GalleryShare.findByIdAndDelete(update._id);

    if (!deletedShare) {
      return res.status(404).json({ success: false, message: "Share entry not found" });
    }

    res.json({ success: true, message: "Share entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSharedGalleryByUser,
  addGallerySharingUser,
  updateGalleryShare,
  deleteGalleryShare,
};
