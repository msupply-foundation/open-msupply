// Persistent GraphQL subscription client — the path the REAL omSupply client prefers (useSyncInfo
// uses graphql-ws; it only falls back to polling the syncInfo query when the subscription is down).
//
// k6 has no GraphQL-subscription support, so this speaks the `graphql-transport-ws` protocol by hand
// over a raw websocket:
//   open → {type:connection_init, payload:{Authorization:"Bearer <token>"}} → wait connection_ack
//        → {type:subscribe, payload:{query: syncInfoUpdated}} → receive {type:next} updates
//        → answer {type:ping} with {type:pong} → hold open → {type:complete} + close.
//
// Why it matters: this drives the SHARED, 30s-debounced subscription worker (one server-side
// changelog count per 30s for ALL subscribers), and stresses what scales with *number of connected
// clients* — the ws upgrades, the broadcast fan-out, and the subscription trigger channel — which the
// polling/storm scenarios don't touch. Run it alongside the rest to mirror a real connected fleet.
import ws from 'k6/ws';
import { Trend, Counter, Rate } from 'k6/metrics';
import { operations } from '../operations.generated.js';
import { makeCtx } from '../lib/ctx.js';
import { config } from '../config.js';

const subAckMs = new Trend('sub_ack_ms', true); // connection_init → connection_ack latency
const subUpdates = new Counter('sub_updates'); // syncInfoUpdated messages pushed to this client
const subErrors = new Counter('sub_errors'); // protocol "error" frames + transport errors
const subConnectFailed = new Rate('sub_connect_failed'); // ws upgrade didn't reach 101

// wss://host:8000/graphql/ws — same URL the client builds (httpToWsUrl + '/ws').
const WS_URL = config.graphqlUrl.replace(/^http/, 'ws') + '/ws';

export function syncSubscriber(data) {
  const ctx = makeCtx(data);
  const params = {
    // Request the modern graphql-ws subprotocol; async-graphql negotiates it.
    headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' },
    tags: { scenario: 'syncSubscriber' },
  };

  const initSentAt = Date.now();
  const res = ws.connect(WS_URL, params, socket => {
    socket.on('open', () => {
      socket.send(
        JSON.stringify({
          type: 'connection_init',
          payload: { Authorization: `Bearer ${ctx.token}` },
        })
      );
    });

    socket.on('message', raw => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (_e) {
        return;
      }
      switch (msg.type) {
        case 'connection_ack':
          subAckMs.add(Date.now() - initSentAt);
          socket.send(
            JSON.stringify({
              id: '1',
              type: 'subscribe',
              payload: { operationName: 'syncInfoUpdated', query: operations.syncInfoUpdated.query },
            })
          );
          break;
        case 'next': // a syncInfoUpdated push (carries numberOfRecordsInPushQueue)
          subUpdates.add(1);
          break;
        case 'ping': // graphql-transport-ws app-level keepalive
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
        case 'error':
          subErrors.add(1);
          break;
        // 'complete' / 'connection_ack' handled above; ignore others.
      }
    });

    // ws control-frame pings are answered automatically by k6/ws; the graphql-transport-ws
    // app-level {type:'ping'} is handled in the message switch above.
    socket.on('error', () => subErrors.add(1));

    // Hold the subscription open like a real logged-in client, then close cleanly. A finite hold
    // (vs the whole run) also reproduces the reconnect churn real clients show under load.
    socket.setTimeout(() => {
      socket.send(JSON.stringify({ id: '1', type: 'complete' }));
      socket.close();
    }, config.syncSubscriberHoldSeconds * 1000);
  });

  // ws upgrade success is HTTP 101; anything else is a failed connect.
  subConnectFailed.add(!(res && res.status === 101));
}
