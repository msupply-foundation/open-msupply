/*
 * Placeholder data for the outbound-shipment skeleton pages — deterministic,
 * generated in-module (no data layer exists yet). Shapes loosely mirror the
 * current app's outbound-shipment list/detail fragments; this whole file is
 * replaced when a real data layer lands.
 */

export interface StatusOption {
  value: string
  label: string
  /** StatusChip colour — always a --status-* contract token, never a literal. */
  colour: string
}

export const SHIPMENT_STATUSES: StatusOption[] = [
  { value: 'new', label: 'New', colour: 'var(--status-new)' },
  { value: 'allocated', label: 'Allocated', colour: 'var(--status-allocated)' },
  { value: 'picked', label: 'Picked', colour: 'var(--status-picked)' },
  { value: 'shipped', label: 'Shipped', colour: 'var(--status-shipped)' },
  { value: 'delivered', label: 'Delivered', colour: 'var(--status-delivered)' },
]

export const statusLabel = (value: string): string =>
  SHIPMENT_STATUSES.find((s) => s.value === value)?.label ?? value

export const statusColour = (value: string): string =>
  SHIPMENT_STATUSES.find((s) => s.value === value)?.colour ??
  'var(--status-new)'

export interface ShipmentRow {
  reference: string
  customer: string
  status: string
  items: number
  theirReference: string
  created: string
}

const CUSTOMERS = [
  'Buka Rural Hospital',
  'Arawa Health Centre',
  'Kokopo District Store',
  'Wewak Provincial Hospital',
  'Mount Hagen Clinic',
  'Lae Urban Aid Post',
]

export const SHIPMENTS: ShipmentRow[] = Array.from({ length: 24 }, (_, i) => ({
  reference: `OS-${(1024 + i).toString().padStart(6, '0')}`,
  customer: CUSTOMERS[i % CUSTOMERS.length],
  status: SHIPMENT_STATUSES[i % SHIPMENT_STATUSES.length].value,
  items: 3 + ((i * 7) % 22),
  theirReference: i % 3 === 0 ? '' : `PO-${(2048 + i * 3).toString().padStart(5, '0')}`,
  created: `2026-07-${(1 + (i % 28)).toString().padStart(2, '0')}`,
}))

export interface ShipmentLine {
  code: string
  item: string
  packSize: number
  quantity: number
  batch: string
  expiry: string
}

const ITEMS: Array<[string, string]> = [
  ['030453', 'Amoxicillin 250mg tablets'],
  ['030862', 'Paracetamol 500mg tablets'],
  ['037020', 'Ibuprofen 200mg tablets'],
  ['030316', 'Oral rehydration salts 20.5g sachet'],
  ['031031', 'Zinc sulfate 20mg tablets'],
  ['034048', 'Ceftriaxone 1g injection'],
  ['036734', 'Examination gloves, latex, medium'],
  ['030293', 'Syringe 5ml, disposable'],
]

/** Deterministic per-shipment lines, seeded from the reference number. */
export const linesFor = (reference: string): ShipmentLine[] => {
  const seed = Number.parseInt(reference.slice(-4), 10) || 1
  return ITEMS.map(([code, item], i) => ({
    code,
    item,
    packSize: [1, 10, 100][(seed + i) % 3],
    quantity: 5 + ((seed * (i + 3)) % 240),
    batch: `B${100 + ((seed + i * 13) % 900)}`,
    expiry: `${2027 + (i % 2)}-${(1 + ((seed + i) % 12)).toString().padStart(2, '0')}`,
  }))
}
