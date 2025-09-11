let clients = [];

function addClient(req, res) {
  // Push the client into the array
  clients.push(res);

  // Remove when client disconnects
  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
}

function sendEvent(data) {
  clients.forEach(res => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

module.exports = { addClient, sendEvent };
