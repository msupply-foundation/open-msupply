// Label-printer form logic (spec/settings/rules.md § Devices — label
// printer), pure for the unit tests: the all-four-fields gate on both Test and
// Save (AC-LP2 — held even in USB mode, captured as-is), and the input builder
// that carries ONLY the four network/label fields — the USB preference is
// device-local and never part of what travels to the server (AC-LP3).

import type { UpdateLabelPrinterSettingsVariables } from './labelPrinter.generated';

export type LabelPrinterForm = {
  address: string;
  port: number | undefined;
  labelHeight: number | undefined;
  labelWidth: number | undefined;
};

// The unconfigured seeds specced in rules § Devices — label printer (blank
// address; a Zebra-style printer's standard port and label geometry).
export const defaultLabelPrinterForm = (): LabelPrinterForm => ({
  address: '',
  port: 9100,
  labelHeight: 290,
  labelWidth: 576,
});

// Both Test and Save stay disabled until address, port, label height, and
// label width are ALL filled in — even when testing via USB (AC-LP2).
export const canTestOrSave = (form: LabelPrinterForm): boolean =>
  form.address.trim() !== '' &&
  form.port != null &&
  form.port > 0 &&
  form.labelHeight != null &&
  form.labelHeight > 0 &&
  form.labelWidth != null &&
  form.labelWidth > 0;

// Only the four server-side fields — no USB flag exists on the wire (AC-LP3).
export const buildLabelPrinterInput = (
  form: LabelPrinterForm
): UpdateLabelPrinterSettingsVariables['input'] => ({
  address: form.address.trim(),
  port: form.port ?? 0,
  labelHeight: form.labelHeight ?? 0,
  labelWidth: form.labelWidth ?? 0,
});
