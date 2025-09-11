const express = require("express");
const router = express.Router();
const commentCtrl = require("../controller/commentController");

router.get("/comment/stream",  commentCtrl.streamComments);

module.exports = router;
