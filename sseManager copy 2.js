// sseManager.js

const sseClients = {}; // { galleryId: [ { id, userId, res } ] }

// Add client (one per user per gallery)
// function addClient(res, galleryId, userId) {
//   if (!sseClients[galleryId]) sseClients[galleryId] = [];

//   // Remove old connection for same user to prevent duplicates
//   sseClients[galleryId] = sseClients[galleryId].filter(c => c.userId !== userId);

//   const clientId = Date.now() + Math.random(); // unique id
//   sseClients[galleryId].push({ id: clientId, userId, res });

//   return clientId;
// }

function addClient(res, galleryId, userId) {
  if (!sseClients[galleryId]) sseClients[galleryId] = [];
  const exists = sseClients[galleryId].find(c => c.userId === userId);
  console.log("sse exists", exists,userId)
  console.log("sseClients",sseClients);
  if (exists) return exists.id;

  const clientId = Date.now();
  sseClients[galleryId].push({ id: clientId, res, userId });
  return clientId;
}

// Remove client
function removeClient(clientId, galleryId) {
  if (!sseClients[galleryId]) return;
  sseClients[galleryId] = sseClients[galleryId].filter(c => c.id !== clientId);
  if (sseClients[galleryId].length === 0) delete sseClients[galleryId];
}

// Send data to all clients in a gallery
function sendToGallery(galleryId, data) {
  if (!sseClients[galleryId]) return;
  console.log("galleryID",galleryId)
  console.log("dataaaa",data)
  sseClients[galleryId].forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error("Error sending SSE to client:", err);
    }
  });
}

// Clear all clients for a gallery (optional, manual or on server restart)
function clearGalleryClients(galleryId) {
  if (!sseClients[galleryId]) return;
  sseClients[galleryId].forEach(c => c.res.end());
  delete sseClients[galleryId];
}

// Periodic cleanup for disconnected clients
setInterval(() => {
  Object.keys(sseClients).forEach(galleryId => {
    sseClients[galleryId] = sseClients[galleryId].filter(c => !c.res.finished);
    if (sseClients[galleryId].length === 0) delete sseClients[galleryId];
  });
}, 30000); // every 30 seconds

module.exports = {
  sseClients,
  addClient,
  removeClient,
  sendToGallery,
  clearGalleryClients,
};

