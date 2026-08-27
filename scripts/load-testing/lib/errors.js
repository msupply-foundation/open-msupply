// GraphQL error detection.
//
// The omSupply GraphQL endpoint returns HTTP 200 even on failure: transport errors arrive in a
// top-level `errors[]` array, and *domain* errors arrive as union types whose `__typename` ends in
// "Error" (e.g. InsertRequestRequisitionError, NodeError). A naive http-status check passes on both,
// so we must inspect the body. The recursive `__typename` walk is the canonical domain-error detector
// — op modules never hand-code error-field checks.

// Walk a parsed `data` tree for the first node whose __typename ends in "Error".
// Returns { typename, description } or null.
function findUnionError(node) {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const r = findUnionError(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof node.__typename === 'string' && node.__typename.endsWith('Error')) {
    const description = node.error && node.error.description;
    return { typename: node.__typename, description: description || null };
  }
  for (const key in node) {
    const r = findUnionError(node[key]);
    if (r) return r;
  }
  return null;
}

// Returns { ok, kind, detail, body }. kind ∈ http | parse | transport | union (only when !ok);
// detail is a short human-readable reason so failures are diagnosable from the output (no probe needed).
export function classify(res) {
  if (res.status !== 200) return { ok: false, kind: 'http', detail: `HTTP ${res.status}` };

  let body;
  try {
    body = JSON.parse(res.body);
  } catch (_e) {
    return { ok: false, kind: 'parse', detail: 'invalid JSON response' };
  }

  if (body && Array.isArray(body.errors) && body.errors.length > 0) {
    const e = body.errors[0];
    const detail = (e.extensions && e.extensions.details) || e.message || 'transport error';
    return { ok: false, kind: 'transport', detail, body };
  }
  const ue = findUnionError(body && body.data);
  if (ue) {
    return { ok: false, kind: 'union', detail: ue.description || ue.typename, body };
  }
  return { ok: true, body };
}
