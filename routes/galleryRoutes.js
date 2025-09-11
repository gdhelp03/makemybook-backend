const express = require("express");
const router = express.Router();
const { listGallery, addGallery, getGallerySignature,getGallerySignatureBySlug,getImagesFromFolder,deleteImagesFromCloudinary, getGalleryWithPermission} = require("../controller/galleryController");
const commentCtrl = require("../controller/commentController");
//add a order
router.get("/list", listGallery);
router.post("/add", addGallery);
router.post("/gallery-permisison", getGalleryWithPermission);
router.post("/gallery-signature", getGallerySignature);
router.post("/gallery-signature-by-slug", getGallerySignatureBySlug);
router.post("/gallery-images-by-slug", getImagesFromFolder);
router.post("/delete-gallery-images", deleteImagesFromCloudinary);

router.post("/comment/add",  commentCtrl.addComment);
router.post("/comment/list", commentCtrl.getComments);
router.post("/comment/update", commentCtrl.updateComment);
router.post("/comment/delete",  commentCtrl.deleteComment);

module.exports = router;
