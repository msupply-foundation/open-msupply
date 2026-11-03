/*
 * The texts a row's Additional info shows from its active program events
 * (spec/encounters/rules.md § additional information): the events whose type
 * begins `status`, in the order the server returns them (newest first). The
 * server returns every active event type, so the narrowing is the client's
 * (spec/encounters/contract.md, wire trap). An event without text shows
 * nothing.
 */
export const statusEventTexts = (
  events: readonly { type: string; data: string | null }[]
): string[] =>
  events
    .filter(event => event.type.startsWith('status'))
    .map(event => event.data)
    .filter((data): data is string => !!data);
