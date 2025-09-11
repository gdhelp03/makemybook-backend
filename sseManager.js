// sseManager.js
// Central SSE registry. One connection per (galleryId, userId).

const galleries = new Map(); // galleryId -> Map(userId -> { id, res, ts })

function addClient(res, galleryId, userId) {
  if (!galleryId || !userId || !res) return null;

  if (!galleries.has(galleryId)) galleries.set(galleryId, new Map());
  const users = galleries.get(galleryId);

  // If user already connected for this gallery, close the old one to avoid dupes
  if (users.has(userId)) {
    try { users.get(userId).res.end(); } catch (_) {}
    users.delete(userId);
  }

  const id = Date.now() + Math.random();
  users.set(userId, { id, res, ts: Date.now() });

  // Keep-alive ping every 25s so proxies don’t kill the stream
  const keepAlive = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {
      clearInterval(keepAlive);
      removeClient(id, galleryId, userId);
    }
  }, 25000);

  // Tag interval so we can clear it on close
  res.__keepAlive = keepAlive;

  return id;
}

function removeClient(id, galleryId, userId) {
  const users = galleries.get(galleryId);
  if (!users) return;

  const entry = users.get(userId);
  if (entry && entry.id === id) {
    try {
      if (entry.res.__keepAlive) clearInterval(entry.res.__keepAlive);
      entry.res.end();
    } catch (_) {}
    users.delete(userId);
  }
  if (users.size === 0) galleries.delete(galleryId);
}

function sendToGallery(galleryId, data) {
  const users = galleries.get(galleryId);
  if (!users) return;

  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const [, { res }] of users) {
    try { res.write(payload); } catch (_) {/* ignore broken pipes */}
  }
}

function resetGallery(galleryId) {
  const users = galleries.get(galleryId);
  if (!users) return;
  for (const [userId, { id }] of users) removeClient(id, galleryId, userId);
}

function resetAll() {
  for (const [galleryId] of galleries) resetGallery(galleryId);
}

module.exports = {
  addClient,
  removeClient,
  sendToGallery,
  resetGallery,
  resetAll,
};
