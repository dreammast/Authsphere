import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';

let wssInstance: WebSocketServer | null = null;

export function setupAuditWebSocket(wss: WebSocketServer) {
  wssInstance = wss;

  wss.on('connection', (ws: WebSocket) => {
    logger.debug('Audit WebSocket client connected');
    ws.send(JSON.stringify({ type: 'connected', message: 'Audit stream connected' }));

    ws.on('close', () => logger.debug('Audit WebSocket client disconnected'));
    ws.on('error', (err) => logger.error('WebSocket error:', err));
  });
}

// Broadcast audit event to all connected clients
export function broadcastAuditEvent(event: {
  action: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  userEmail?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!wssInstance) return;

  const message = JSON.stringify({
    type: 'audit',
    ...event,
    timestamp: new Date().toISOString(),
  });

  wssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
