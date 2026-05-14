export function paginationVars(first?: number, offset?: number) {
  return {
    first: first ?? 25,
    offset: offset ?? 0,
  };
}

export function formatListResult(
  entityName: string,
  nodes: Record<string, unknown>[],
  totalCount: number,
  first: number,
  offset: number
): string {
  if (totalCount === 0) {
    return `No ${entityName} found.`;
  }

  const lines: string[] = [
    `Found ${totalCount} ${entityName} (showing ${offset + 1}-${Math.min(offset + first, totalCount)}):`,
    '',
  ];

  for (const node of nodes) {
    lines.push(formatRecord(node));
    lines.push('');
  }

  if (offset + first < totalCount) {
    lines.push(
      `... and ${totalCount - offset - first} more. Use offset=${offset + first} to see the next page.`
    );
  }

  return lines.join('\n');
}

export function formatRecord(record: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) continue;
    if (key === '__typename') continue;

    if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    } else if (Array.isArray(value)) {
      lines.push(`  ${key}: [${value.length} items]`);
    } else {
      lines.push(`  ${key}: ${value}`);
    }
  }
  return lines.join('\n');
}
