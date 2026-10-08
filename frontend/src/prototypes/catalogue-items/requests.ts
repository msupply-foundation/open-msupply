/*
 * The approval model for catalogue changes.
 *
 * A REQUEST is a proposed change to central data, from one of two sources: the
 * New item form (one record) or an import batch (many). Nothing reaches a
 * facility until a request is approved, which is what lets the New item dialog
 * honestly say "Once approved, will be added...".
 *
 * Two deliberate rules, both visible in the UI rather than buried:
 *
 *  1. A rejection carries a reason. A bare "rejected" leaves the requester with
 *     no way forward, which is how a queue silently becomes a dead end.
 *  2. Nobody approves their own request (`canApprove` below). Central data
 *     reaches every store, so it gets the same separation of duties a stock
 *     adjustment would. The UI shows the blocked action with the reason instead
 *     of hiding it, so the rule is learnable.
 *
 * An import batch is ONE decision, not one per row: approving 395 rows
 * individually is not review, it is data entry.
 *
 * PROTOTYPE: fixed demo data, no persistence. `itemCount` on a batch is what
 * makes the blast radius of a single click legible to the approver.
 */

export type RequestKind = 'new-item' | 'import-batch';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** The signed-in user, so self-approval can be blocked in the demo. */
export const CURRENT_USER = 'Dev Eloper';

export interface RequestField {
  label: string;
  value: string;
}

export interface ItemRequest {
  id: string;
  kind: RequestKind;
  /** One line for the queue: the item name, or what the batch contains. */
  summary: string;
  requestedBy: string;
  /** Fixed ISO stamps: demo data, so no clock is read. */
  requestedAt: string;
  status: RequestStatus;
  /** The proposed record, read-only in the review dialog. */
  fields: RequestField[];
  /** Import batches only: how many items ride on this one decision. */
  itemCount?: number;
  decidedBy?: string;
  decidedAt?: string;
  /** Always set on a rejection; the requester's route forward. */
  reason?: string;
}

export const KIND_LABEL: Record<RequestKind, string> = {
  'new-item': 'New item',
  'import-batch': 'Import batch',
};

/*
 * Status tone. StatusChip takes a colour VALUE, always a token (colour literals
 * live only in tokens.css). The chip's label carries the meaning; colour only
 * reinforces it.
 */
export const STATUS_CHIP: Record<
  RequestStatus,
  { label: string; colour: string }
> = {
  pending: { label: 'Pending', colour: 'var(--warning-main)' },
  approved: { label: 'Approved', colour: 'var(--success-main)' },
  rejected: { label: 'Rejected', colour: 'var(--error-main)' },
};

/**
 * Whether `user` may decide this request. Pending only, and never your own:
 * see rule 2 above. Returns the REASON when blocked, so the UI can explain the
 * disabled action rather than leaving the user guessing.
 */
export const approvalBlock = (
  request: ItemRequest,
  user: string
): string | undefined => {
  if (request.status !== 'pending') return 'This request has already been decided.';
  if (request.requestedBy === user)
    return 'You cannot approve your own request. Another catalogue approver has to review it.';
  return undefined;
};

export const canApprove = (request: ItemRequest, user: string): boolean =>
  approvalBlock(request, user) === undefined;

export const pendingCount = (requests: ItemRequest[]): number =>
  requests.filter(r => r.status === 'pending').length;

export const REQUESTS: ItemRequest[] = [
  {
    id: 'req-1',
    kind: 'new-item',
    summary: 'Amlodipine 5mg tablets',
    requestedBy: 'Sione Fifita',
    requestedAt: '2026-08-18T09:12:00.000Z',
    status: 'pending',
    fields: [
      { label: 'Item name', value: 'Amlodipine 5mg tablets' },
      { label: 'Item code', value: 'AM0500' },
      { label: 'Type', value: 'Stock (held and counted)' },
      { label: 'Unit', value: 'Tablet' },
      { label: 'Default pack size', value: '100' },
      { label: 'Strength', value: '5mg' },
      { label: 'Categories', value: 'Cardiovascular' },
      { label: 'VEN category', value: 'E (Essential)' },
      { label: 'Master lists', value: 'National EML 2026' },
    ],
  },
  {
    id: 'req-2',
    kind: 'import-batch',
    summary: 'essential-medicines-2026-q3.csv',
    requestedBy: 'Mele Tupou',
    requestedAt: '2026-08-18T14:40:00.000Z',
    status: 'pending',
    itemCount: 395,
    fields: [
      { label: 'File', value: 'essential-medicines-2026-q3.csv' },
      { label: 'Rows in file', value: '412' },
      { label: 'Ready to import', value: '395' },
      { label: 'New items', value: '368' },
      { label: 'Updates to existing items', value: '27' },
      { label: 'Excluded (errors)', value: '14' },
      { label: 'Excluded (already up to date)', value: '3' },
      { label: 'Existing rows', value: 'Add new and update existing' },
      { label: 'Matched on', value: 'Item code' },
    ],
  },
  {
    // Requested by the signed-in user, so the self-approval block is visible.
    id: 'req-3',
    kind: 'new-item',
    summary: 'Oxytocin 10 IU/mL injection',
    requestedBy: CURRENT_USER,
    requestedAt: '2026-08-19T08:05:00.000Z',
    status: 'pending',
    fields: [
      { label: 'Item name', value: 'Oxytocin 10 IU/mL injection' },
      { label: 'Item code', value: 'OX0010' },
      { label: 'Type', value: 'Stock (held and counted)' },
      { label: 'Unit', value: 'Ampoule' },
      { label: 'Default pack size', value: '10' },
      { label: 'Restricted to', value: 'Cold room (2 to 8 degrees C)' },
      { label: 'VEN category', value: 'V (Vital)' },
      { label: 'Master lists', value: 'National EML 2026, Hospital formulary' },
    ],
  },
  {
    id: 'req-4',
    kind: 'new-item',
    summary: 'Zinc sulfate 20mg dispersible tablets',
    requestedBy: 'Sione Fifita',
    requestedAt: '2026-08-14T11:20:00.000Z',
    status: 'approved',
    decidedBy: 'Ling T.',
    decidedAt: '2026-08-15T07:55:00.000Z',
    fields: [
      { label: 'Item name', value: 'Zinc sulfate 20mg dispersible tablets' },
      { label: 'Item code', value: 'ZN0020' },
      { label: 'Unit', value: 'Tablet' },
      { label: 'Master lists', value: 'Paediatric kit' },
    ],
  },
  {
    id: 'req-5',
    kind: 'new-item',
    summary: 'Paracetamol 500mg tabs (duplicate)',
    requestedBy: 'Mele Tupou',
    requestedAt: '2026-08-12T15:02:00.000Z',
    status: 'rejected',
    decidedBy: 'Ling T.',
    decidedAt: '2026-08-13T09:30:00.000Z',
    reason:
      'PA0555 already covers this. Use the existing item rather than adding a second code for the same product.',
    fields: [
      { label: 'Item name', value: 'Paracetamol 500mg tabs' },
      { label: 'Item code', value: 'PA0556' },
      { label: 'Unit', value: 'Tablet' },
    ],
  },
];
