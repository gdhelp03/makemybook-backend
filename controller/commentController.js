const Comment = require("../models/GalleryComments");
const { addClient, removeClient, sendToGallery } = require("../sseManager");
const jwt = require("jsonwebtoken");

// verify token from query param on SSE (since EventSource can't set headers)
function verifyTokenFromQuery(req) {
  const { token } = req.query;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

// --- SSE: /api/stream/comment/stream?galleryId=...&token=...
const streamComments = (req, res) => {
  const { galleryId } = req.query;
  const user = verifyTokenFromQuery(req);
  if (!galleryId || !user) return res.status(401).json({ message: "Unauthorized" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // one connection per user per gallery
  const clientId = addClient(res, galleryId, user._id);

  // greet
  res.write(`event: connected\ndata: ${JSON.stringify({ galleryId })}\n\n`);

  // cleanup
  req.on("close", () => removeClient(clientId, galleryId, user._id));
};

// --- Add
const addComment = async (req, res) => {
  const user = req.user;
  const { galleryId, text } = req.body;
  if (!galleryId || !text) return res.status(400).json({ message: "Missing fields" });

  const comment = await Comment.create({
    galleryId,
    userId: user._id,
    text,
    author: {
      name: user.name || "Anonymous",
      avatar: user.image || "", // optional
    },
  });

  // include a derived display field: either avatar url or initials
  const initials = (comment.author?.name || "AN").slice(0, 2).toUpperCase();
  const payload = {
    type: "added",
    comment: {
      ...comment.toObject(),
      author: { ...comment.author, display: comment.author?.avatar || initials },
    },
  };

  sendToGallery(galleryId, payload);
  res.status(201).json(comment);
};

// --- Update
const updateComment = async (req, res) => {
  try {
    const { commentId, text } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, userId },
      { text, editedAt: new Date() },
      { new: true }
    );
    if (!comment) return res.status(404).json({ message: "Comment not found or not authorized" });

    sendToGallery(comment.galleryId, { type: "updated", comment });
    res.json({ message: "Comment updated", comment });
  } catch (err) {
    console.error("Update comment error:", err);
    res.status(500).json({ message: "Error updating comment" });
  }
};

// --- Delete (soft delete recommended; here hard delete kept as your code)
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findOneAndDelete({ _id: commentId, userId });
    if (!comment) return res.status(404).json({ message: "Comment not found or not authorized" });

    sendToGallery(comment.galleryId, { type: "deleted", commentId });
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Error deleting comment" });
  }
};

// --- List (page by lastId, newest first from DB, but UI renders bottom-aligned)
const getComments = async (req, res) => {
  try {
    const { galleryId, lastId, limit = 20 } = req.body;
    if (!galleryId) return res.status(400).json({ message: "galleryId is required" });

    const q = { galleryId, status: "active" };
    if (lastId) q._id = { $lt: lastId };

    const comments = await Comment.find(q).sort({ _id: -1 }).limit(Number(limit));
    res.json(comments);
  } catch (err) {
    console.error("getComments error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  streamComments,
  addComment,
  updateComment,
  deleteComment,
  getComments,
};
