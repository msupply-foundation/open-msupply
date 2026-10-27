// Whether a listed document is recorded against the requisition itself rather
// than transferred from the customer's linked internal order (rules ›
// documents; contract › documents: each node's recordId is the discriminator).
// Only an own-record document may be removed; the customer's stay read-only.
export const isOwnDocument = (
  document: { recordId: string },
  requisitionId: string
): boolean => document.recordId === requisitionId;
