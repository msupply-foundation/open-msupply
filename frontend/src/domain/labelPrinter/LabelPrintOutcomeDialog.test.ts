import { describe, expect, it } from 'vitest';
import { printOutcomeReport } from './LabelPrintOutcomeDialog';

// What each outcome tells the user, and where (spec/settings/ui-surface.md §
// what a print attempt says; OMS-REG-SET-05.42, .43). Stated once for every
// screen that prints labels, so this is the one place it is asserted.

describe('printOutcomeReport', () => {
  it('reports success on the control alone, with no dialog', () => {
    expect(printOutcomeReport({ kind: 'printed' })).toEqual({ flash: 'done' });
  });

  it('sends the user to Settings when no printer is configured', () => {
    const report = printOutcomeReport({ kind: 'not-configured' });

    expect(report.dialog).toEqual({
      severity: 'warning',
      message: 'error.label-printer-not-configured',
    });
    // Caught before any request, so the control never claims an attempt.
    expect(report.flash).toBeUndefined();
  });

  it('shows the no-USB-printer message itself, not behind a disclosure', () => {
    const report = printOutcomeReport({ kind: 'no-usb-printer' });

    expect(report).toEqual({
      flash: 'failed',
      dialog: {
        severity: 'error',
        message: 'error.no-usb-printer-found',
      },
    });
    // The one actionable message in the set: attach a printer, or install the
    // print service. Burying it in the disclosure would hide the instruction.
    expect(report.dialog?.detail).toBeUndefined();
  });

  it('puts what actually happened behind the disclosure on a failure', () => {
    expect(
      printOutcomeReport({ kind: 'failed', detail: 'Connection refused' })
    ).toEqual({
      flash: 'failed',
      dialog: {
        severity: 'error',
        message: 'error.printing-label',
        detail: 'Connection refused',
      },
    });
  });
});
