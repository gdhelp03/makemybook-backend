const Comment = require("../models/GalleryComments");
const { addClient, sendToGallery,sseClients,removeClient } = require("../sseManager");


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


// const streamComments = (req, res) => {
//   const { galleryId, token } = req.query;
//   const user = verifyTokenFromQuery(req, token);

//   if (!galleryId || !user) return res.status(401).json({ message: "Unauthorized" });

//   res.set({
//     "Content-Type": "text/event-stream",
//     "Cache-Control": "no-cache",
//     Connection: "keep-alive",
//   });
//   res.flushHeaders();

//   const clientId = addClient(galleryId, res);

//   req.on("close", () => {
//     removeClient(galleryId, clientId);
//   });

//   res.write(`event: connected\ndata: ${JSON.stringify({ galleryId })}\n\n`);
// };

const streamComments = (req, res) => {
  const { galleryId } = req.query;
  if (!galleryId) return res.status(400).json({ message: "galleryId required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = addClient(res, galleryId);

  req.on("close", () => {
    removeClient(clientId, galleryId);
  });
};


// --- Add comment
// const addComment = async (req, res) => {
//   try {
//     const { galleryId, text } = req.body;
//     const userId = req.user._id;

//     const comment = new Comment({
//       galleryId,
//       userId,
//       text
//     });
//     await comment.save();

//     // Broadcast only to this gallery
//     sendToGallery(galleryId, "comment-added", comment);

//     res.status(201).json({ message: "Comment added", comment });
//   } catch (err) {
//     console.error("Add comment error:", err);
//     res.status(500).json({ message: "Error adding comment" });
//   }
// };



  // _id: '689ee2207e999df5d02ec23a',
  // name: 'Gagandeep Singh',
  // email: 'gd.help97@gmail.com',
  // image: 'https://lh3.googleusercontent.com/a/ACg8ocJV_TipSXgjpKVHL9aqmh2yyWbBLhPL4B1aBdkhQToN77dmFw=s96-c',
  // iat: 1755446556,
  // exp: 1755532956

const addComment = async (req, res) => {
  console.log("test1")
  const { galleryId, text } = req.body;
  const user = req.user;
  

  const comment = await Comment.create({
    galleryId,
    text,
    userId: user._id,
    author: {
      name: user.name || "Anonymous",
      avatar: user.image || "", // or user.profileImage
    },
  });

  // Broadcast to all clients in that gallery
  sendToGallery(galleryId, { type: "added", comment });

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
