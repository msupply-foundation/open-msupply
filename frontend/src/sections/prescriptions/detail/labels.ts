import { PRINT_LABEL_PRESCRIPTION_URL } from '../../../config';
import type { PrescriptionFieldsFragment } from './prescriptionDetail.generated';

// Dispensing-label printing (spec/prescriptions/rules.md § label printing;
// AC-E2): one label per dispensed ITEM — quantity summary + directions,
// patient name and code, store/date/clinician — POSTed to the server's
// label-print endpoint. Requires a configured label printer (the caller
// gates on the labelPrinterSettings read). The payload mirrors the reference
// client's label shape; the item-warning slot is not fetched here and prints
// empty (recorded in the build report).

export interface PrescriptionLabel {
  itemDetails: string;
  itemDirections: string;
  warning: string;
  patientDetails: string;
  details: string;
}

type Line = PrescriptionFieldsFragment['lines']['nodes'][number];

/** Build one label per dispensed item (lines merged, units summed). */
export const buildLabels = (
  node: PrescriptionFieldsFragment,
  storeName: string,
  lines: readonly Line[] = node.lines.nodes
): PrescriptionLabel[] => {
  const byItem = new Map<string, Line[]>();
  for (const line of lines) {
    if (line.type !== 'STOCK_OUT') continue;
    const group = byItem.get(line.itemId);
    if (group) group.push(line);
    else byItem.set(line.itemId, [line]);
  }
  const clinician = node.clinician
    ? ` - ${node.clinician.lastName}, ${node.clinician.firstName}`
    : '';
  const patientDetails = node.patient
    ? `${node.patient.name} - ${node.patient.code}`
    : '';
  const details = `${storeName} - ${new Date(
    node.createdDatetime
  ).toLocaleDateString()}${clinician}`;

  return [...byItem.values()].map(group => {
    const first = group[0];
    const units = group.reduce(
      (sum, line) => sum + line.numberOfPacks * line.packSize,
      0
    );
    return {
      itemDetails: `${units} ${first.item.unitName ?? ''} ${first.itemName}`,
      itemDirections: group.find(line => line.note)?.note ?? '',
      warning: '',
      patientDetails,
      details,
    };
  });
};

/**
 * The outcome of a print attempt. `detail` is what the user is shown behind the
 * error disclosure, so it must always say something: the endpoint has no
 * structured error shape (spec/prescriptions/contract.md § label printing), the
 * plain-text body IS the message.
 */
export type PrintLabelsOutcome = { ok: true } | { ok: false; detail: string };

/**
 * POST the labels to the server's prescription label-print endpoint. Same
 * non-throwing style as the report-file fetches — a failure resolves, it never
 * throws — and the caller reports it on the control that started it
 * (spec/ui-standards/controls.md § action feedback). Every failure path here
 * MUST resolve a detail: an unprintable label reaches nobody but this user, and
 * a report with nothing in it is what issue #818 was.
 */
export const printLabels = async (
  labels: PrescriptionLabel[]
): Promise<PrintLabelsOutcome> => {
  try {
    const response = await fetch(PRINT_LABEL_PRESCRIPTION_URL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labels),
    });
    if (response.ok) return { ok: true };
    // The body carries the server's message ("Error getting printer settings:
    // …", or the printer error itself). Reading it can fail on its own, and an
    // empty body would leave the report blank — fall back to the status line.
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      detail: body.trim() || `${response.status} ${response.statusText}`.trim(),
    };
  } catch (error) {
    // A transport failure (server down, DNS, offline) — never a structured
    // Error necessarily, so don't assume `.message` is there.
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
};
