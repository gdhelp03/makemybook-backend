const Comment = require("../models/GalleryComments");
const { addClient, sendEvent } = require("../sseManager");

// ===== Update Comment =====
 const updateComment = async (req, res) => {
  try {
    const { commentId, text } = req.body;
    const user = req.user;

    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, userId: user._id },
      { text, editedAt: new Date() },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found or not authorized" });
    }

    sendToGallery(comment.galleryId, { type: "updated", comment });

    res.json(comment);
  } catch (error) {
    console.error("updateComment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Delete Comment =====
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.body;
    const user = req.user;

    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, userId: user._id },
      { status: "deleted" },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found or not authorized" });
    }

    sendToGallery(comment.galleryId, { type: "deleted", commentId: comment._id });

    res.json({ message: "Comment deleted", commentId: comment._id });
  } catch (error) {
    console.error("deleteComment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Get Comments (with pagination) =====
const getComments = async (req, res) => {
  try {
    const { galleryId, lastId, limit = 20 } = req.body;

    if (!galleryId) {
      return res.status(400).json({ message: "galleryId is required" });
    }

    const query = { galleryId, status: "active" };

    // If lastId is provided → fetch older comments (for infinite scroll)
    if (lastId) {
      query._id = { $lt: lastId };
    }

    const comments = await Comment.find(query)
      .sort({ _id: -1 }) // newest first
      .limit(Number(limit) || 20);

    res.json(comments);
  } catch (error) {
    console.error("getComments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const streamComments = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Register client
  addClient(req, res);

  // Send initial connection ack
  res.write(`data: ${JSON.stringify({ message: "connected" })}\n\n`);
};

const addComment = async (req, res) => {
  try {
    const { galleryId, text } = req.body;

    // Save comment in DB (your logic here)
    const comment = { galleryId, text, createdAt: new Date() };

    // Broadcast via SSE
    sendEvent(comment);

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  streamComments
};
