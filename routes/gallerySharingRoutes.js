const express = require("express");
const router = express.Router();
const { getSharedGalleryByUser, addGallerySharingUser,updateGalleryShare, deleteGalleryShare} = require("../controller/galleryShareController");

router.post("/list", getSharedGalleryByUser);
router.post("/add", addGallerySharingUser);
router.post("/update", updateGalleryShare);
router.post("/delete", deleteGalleryShare);

module.exports = router;
