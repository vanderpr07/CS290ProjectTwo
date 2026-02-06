import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-memory document store: { docId: { content: string, clients: Set<WebSocket> } }
const docs = new Map();

function getOrCreateDoc(docId) {
  if (!docs.has(docId)) {
    docs.set(docId, { content: '', clients: new Set() });
  }
  return docs.get(docId);
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docId = url.searchParams.get('doc') || 'default';
  const doc = getOrCreateDoc(docId);

  // Register client
  doc.clients.add(ws);

  // Send current document state to new client
  ws.send(JSON.stringify({ type: 'init', content: doc.content }));

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.type === 'update') {
      // Update server state (last-write-wins)
      doc.content = msg.content;

      // Broadcast to all other clients in same document
      for (const client of doc.clients) {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ type: 'update', content: doc.content }));
        }
      }
    }
  });

  ws.on('close', () => {
    doc.clients.delete(ws);
    // Optional cleanup for empty docs
    if (doc.clients.size === 0 && doc.content === '') {
      docs.delete(docId);
    }
  });
});

