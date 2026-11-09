// The Details column's lines from an entry's `from`/`to`; null when neither
// side is a JSON object.
export type ChangeLine =
  | { key: string; kind: 'value'; value: unknown }
  | { key: string; kind: 'changed'; before: unknown; after: unknown }
  | { key: string; kind: 'removed'; before: unknown };

const tryParseObject = (
  value: string | null
): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export const describeChange = (
  from: string | null,
  to: string | null
): ChangeLine[] | null => {
  const fromObj = tryParseObject(from);
  const toObj = tryParseObject(to);
  // A deletion snapshot reads like a creation: the event label says which
  if (!toObj) return fromObj ? describeChange(null, from) : null;

  // `to` leads: the keys that name the record are written there first
  const keys = new Set([...Object.keys(toObj), ...Object.keys(fromObj ?? {})]);
  const lines: ChangeLine[] = [];
  for (const key of keys) {
    const before = fromObj?.[key];
    const after = toObj[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (before != null && after != null)
      lines.push({ key, kind: 'changed', before, after });
    else if (before != null) lines.push({ key, kind: 'removed', before });
    else if (after != null) lines.push({ key, kind: 'value', value: after });
  }
  return lines.length ? lines : null;
};
