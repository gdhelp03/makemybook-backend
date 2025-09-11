const Comment = require("../models/GalleryComments");
const { addClient, sendToGallery,removeClient } = require("../sseManager");
const jwt = require("jsonwebtoken");

const verifyTokenFromQuery = (req) => {
  const { token } = req.query;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// --- SSE Stream
// const streamComments = (req, res) => {
//   const { galleryId } = req.query;
//   const user = verifyTokenFromQuery(req);
//   if (!galleryId || !user) return res.status(401).json({ message: "Unauthorized" });

//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");
//   res.flushHeaders();

//   const clientId = addClient(res, galleryId, user._id);
//   if (!clientId) {
//     return res.end(); // duplicate connection
//   }

//   req.on("close", () => {
//     removeClient(clientId, galleryId);
//   });
// };
const streamComments = (req, res) => {
  const { galleryId } = req.query;
  const user = verifyTokenFromQuery(req);

  if (!galleryId || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Add client (unique per user per gallery)
  const clientId = addClient(res, galleryId, user._id);

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ galleryId })}\n\n`);

  // Remove client on disconnect
  req.on("close", () => {
    removeClient(clientId, galleryId);
  });
};

// --- Add Comment
const addComment = async (req, res) => {
  const user = req.user; // from auth middleware
  const { galleryId, text } = req.body;

  if (!galleryId || !text) return res.status(400).json({ message: "Missing fields" });

  const comment = await Comment.create({
    galleryId,
    text,
    userId: user._id,
    author: {
      name: user.name || "Anonymous",
      avatar: user.image || "", // optional
    },
  });

  // Prepare author display
  const authorDisplay = comment.author.avatar
    ? comment.author.avatar
    : comment.author.name.slice(0, 2).toUpperCase();

  sendToGallery(galleryId, {
    type: "added",
    comment: {
      ...comment.toObject(),
      author: { ...comment.author, display: authorDisplay },
    },
  });

  res.status(201).json(comment);
};

// --- Update comment
const updateComment = async (req, res) => {
  try {
    const { commentId, text } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, userId },
      { text },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: "Comment not found or not authorized" });
    }

    sendToGallery(comment.galleryId, "comment-updated", comment);

    res.json({ message: "Comment updated", comment });
  } catch (err) {
    console.error("Update comment error:", err);
    res.status(500).json({ message: "Error updating comment" });
  }
};

// --- Delete comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findOneAndDelete({ _id: commentId, userId });

    if (!comment) {
      return res.status(404).json({ message: "Comment not found or not authorized" });
    }

    sendToGallery(comment.galleryId, "comment-deleted", { _id: commentId });

    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Error deleting comment" });
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

module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  streamComments
};
