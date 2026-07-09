// Trusted layer: our own GraphQL implementation. `as` assertions are permitted here
// (see kdd/type-safety).
//
// Minimal graphql-transport-ws client. Spec (Initialization Logic): we first try the
// subscription; any failure calls onFailure exactly once so the caller can fall back
// to polling.
import type { TypedDocument } from './graphql';
import { GRAPHQL_WS_PATH } from '../config';

type Handlers<TResult> = {
  onData: (data: TResult) => void;
  onFailure: () => void;
};

export function subscribe<TResult, TVariables>(
  document: TypedDocument<TResult, TVariables>,
  variables: TVariables | undefined,
  handlers: Handlers<TResult>
): () => void {
  let disposed = false;
  let failed = false;
  let ws: WebSocket;

  const fail = () => {
    if (disposed || failed) return;
    failed = true;
    handlers.onFailure();
  };

  try {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}${GRAPHQL_WS_PATH}`, 'graphql-transport-ws');
  } catch {
    handlers.onFailure();
    return () => {};
  }

  ws.onopen = () => ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
  ws.onerror = fail;
  ws.onclose = fail;
  ws.onmessage = event => {
    let message: { type?: string; payload?: { data?: unknown } };
    try {
      message = JSON.parse(String(event.data)) as typeof message;
    } catch {
      return fail();
    }
    switch (message.type) {
      case 'connection_ack':
        ws.send(
          JSON.stringify({
            id: '1',
            type: 'subscribe',
            payload: { query: document.query, variables },
          })
        );
        break;
      case 'next':
        if (message.payload?.data != null) handlers.onData(message.payload.data as TResult);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'error':
      case 'complete':
        fail();
        break;
    }
  };

  return () => {
    disposed = true;
    try {
      ws.close();
    } catch {
      // already closed
    }
  };
}
