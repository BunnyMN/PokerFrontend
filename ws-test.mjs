#!/usr/bin/env node

/**
 * Quick WebSocket test script for debugging HELLO/WELCOME/STATE flow
 * 
 * Prerequisites: npm install ws
 * 
 * Usage:
 *   node ws-test.mjs <roomId> <accessToken> <wsUrl>
 * 
 * Example:
 *   node ws-test.mjs "f9dc8efd-82d1-4b88-9dab-1d4c936fae47" "eyJhbGc..." "ws://localhost:4000/ws"
 */

const args = process.argv.slice(2);
const [roomId, accessToken, wsUrl] = args;

if (!roomId || !accessToken || !wsUrl) {
  console.error('Usage: node ws-test.mjs <roomId> <accessToken> <wsUrl>');
  console.error('Example: node ws-test.mjs "uuid-here" "token-here" "ws://localhost:4000/ws"');
  process.exit(1);
}

console.log('[WS-TEST] Starting WebSocket test...');
console.log('[WS-TEST] roomId:', roomId);
console.log('[WS-TEST] token length:', accessToken.length);
console.log('[WS-TEST] wsUrl:', wsUrl);

let WebSocket;
try {
  const wsModule = await import('ws');
  WebSocket = wsModule.default;
} catch (err) {
  console.error('[WS-TEST] Error: "ws" package not found. Install it with: npm install ws');
  process.exit(1);
}

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('[WS-TEST] ✓ WebSocket OPEN');
  
  const helloMessage = {
    type: 'HELLO',
    roomId,
    accessToken,
  };
  
  console.log('[WS-TEST] Sending HELLO:', { type: 'HELLO', roomId, accessToken: `[token length: ${accessToken.length}]` });
  ws.send(JSON.stringify(helloMessage));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('[WS-TEST] ✓ Received message:', JSON.stringify(message, null, 2));
  } catch (err) {
    console.error('[WS-TEST] ✗ Failed to parse message:', err);
    console.error('[WS-TEST] Raw data:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('[WS-TEST] ✗ WebSocket ERROR:', error);
});

ws.on('close', (code, reason) => {
  console.log(`[WS-TEST] ✗ WebSocket CLOSE: code=${code}, reason=${reason.toString()}`);
  process.exit(code !== 1000 ? 1 : 0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('[WS-TEST] ✗ Timeout after 10 seconds');
  ws.close();
  process.exit(1);
}, 10000);
