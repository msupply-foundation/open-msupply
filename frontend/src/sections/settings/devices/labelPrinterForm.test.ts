import { describe, expect, it } from 'vitest';
import {
  buildLabelPrinterInput,
  canTestOrSave,
  defaultLabelPrinterForm,
} from './labelPrinterForm';

const filled = {
  address: '192.168.1.50',
  port: 9100,
  labelHeight: 290,
  labelWidth: 576,
};

// OMS-REG-SET-05.21 — Test and Save require all four fields: any of address, port, label
// height, or label width empty disables both, regardless of the USB toggle
// (the gate takes no USB input at all — it cannot vary by mode).
describe('test/save require all four fields, regardless of USB mode (SET-05.21)', () => {
  it('enables the actions when all four are filled', () => {
    expect(canTestOrSave(filled)).toBe(true);
  });

  it.each([
    ['address', { ...filled, address: '' }],
    ['address (whitespace)', { ...filled, address: '  ' }],
    ['port', { ...filled, port: undefined }],
    ['label height', { ...filled, labelHeight: undefined }],
    ['label width', { ...filled, labelWidth: undefined }],
  ])('stays disabled with %s missing', (_field, form) => {
    expect(canTestOrSave(form)).toBe(false);
  });
});

// OMS-REG-SET-05.22 — the USB preference is device-local: what travels to the server is
// exactly the four network/label fields — no USB flag exists on the input.
describe('saved input carries only the four network/label fields (SET-05.22)', () => {
  it('builds the input from the four fields alone', () => {
    expect(buildLabelPrinterInput(filled)).toEqual({
      address: '192.168.1.50',
      port: 9100,
      labelHeight: 290,
      labelWidth: 576,
    });
  });

  it('has no USB field in the built input', () => {
    expect(Object.keys(buildLabelPrinterInput(filled)).sort()).toEqual([
      'address',
      'labelHeight',
      'labelWidth',
      'port',
    ]);
  });
});

describe('unconfigured defaults (reference client parity)', () => {
  it('seeds the standard Zebra port and label geometry with a blank address', () => {
    expect(defaultLabelPrinterForm()).toEqual({
      address: '',
      port: 9100,
      labelHeight: 290,
      labelWidth: 576,
    });
  });
});
