const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (ws) => {
  console.log('connection');
  ws.on('message', (data) => {
    console.log('onmessage', data);
    ws.send('122');
  });
});
