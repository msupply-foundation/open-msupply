// The single helper every op module uses to call a GraphQL operation.
import http from 'k6/http';
import { check } from 'k6';
import { gqlOpDuration, gqlErrors, gqlErrorCount } from './metrics.js';
import { classify } from './errors.js';

// Per-VU dedupe so each distinct (op, reason) failure is logged to the terminal exactly once —
// enough to diagnose what's failing without flooding the output or needing a separate probe.
const loggedErrors = {};

// ctx: { graphqlUrl, storeId, token }
// op:  { name, query }  (an entry from operations.generated.js)
// category: 'polling' | 'browse' | 'workflow' | 'sync' (used for metric tags + threshold slices)
// Returns parsed `data` on success, or `null` on any failure (caller does `if (!data) return;`).
export function gqlRequest(ctx, op, category, variables) {
  const payload = JSON.stringify({
    operationName: op.name,
    query: op.query,
    variables: variables || {},
  });

  const res = http.post(ctx.graphqlUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ctx.token}`,
    },
    // `name` stops k6 grouping every request under the same /graphql URL; op/category drive slices.
    tags: { op: op.name, category, name: op.name },
  });

  gqlOpDuration.add(res.timings.duration, { op: op.name, category });

  const { ok, kind, detail, body } = classify(res);
  gqlErrors.add(!ok, { op: op.name, category });
  if (!ok) {
    gqlErrorCount.add(1, { op: op.name, category, kind });
    const key = `${op.name}|${kind}|${detail}`;
    if (!loggedErrors[key]) {
      loggedErrors[key] = true;
      console.warn(`[gql-error] ${op.name} (${kind}): ${detail}`);
    }
  }

  check(
    res,
    {
      [`${op.name}: http 200`]: () => res.status === 200,
      [`${op.name}: no gql error`]: () => ok,
    },
    { op: op.name, category }
  );

  return ok ? body.data : null;
}
