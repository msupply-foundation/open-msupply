/**
 * A bulk field's three states. A record's own field has two — a value or
 * nothing — but a field edited across a SELECTION has a third, and it is the
 * default: the user never touched it, so those lines keep whatever they each
 * carry. Only a deliberate act writes.
 *
 * `undefined` is untouched. `{ value: id }` is a pick. `{ value: null }` is a
 * pick the user then cleared, which writes "nothing in particular" to every
 * selected line — a real instruction, not the absence of one.
 */
export type BulkFieldChange = { value: string | null } | undefined;

/**
 * The `NullableStringUpdate` wrappers for a bulk line update, carrying ONLY the
 * fields the user touched.
 *
 * An absent wrapper is what tells the server to leave a field alone (the
 * `Option<NullableUpdate<_>>` on the line update), so an untouched field must
 * not appear in the input at all — sending `{ value: null }` for it would
 * clear, on every selected line, a value the user never looked at.
 */
export const bulkFieldUpdates = (fields: {
  programId: BulkFieldChange;
  campaignId: BulkFieldChange;
}): {
  programId?: { value: string | null };
  campaignId?: { value: string | null };
} => ({
  ...(fields.programId ? { programId: fields.programId } : {}),
  ...(fields.campaignId ? { campaignId: fields.campaignId } : {}),
});

/**
 * What the picker should show as chosen: nothing while the field is untouched,
 * the picked id, or the explicit None row once the user has chosen to clear.
 */
export const bulkFieldValue = (
  change: BulkFieldChange,
  noneValue: string
): string | undefined => (change ? (change.value ?? noneValue) : undefined);

/** Is there anything to apply? Nothing touched is nothing to do. */
export const hasBulkFieldChange = (fields: {
  programId: BulkFieldChange;
  campaignId: BulkFieldChange;
}): boolean =>
  fields.programId !== undefined || fields.campaignId !== undefined;
