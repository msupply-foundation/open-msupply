import { describe, expect, it } from 'vitest';
import {
  canAttachDocuments,
  canAuthorLines,
  canChangeCurrency,
  canCloseLines,
  canDelete,
  canEnterSentDate,
  canRecordPostSendingDates,
  currentStep,
  isOpenToChange,
  ladderFor,
  moveConfirmation,
  moveRefusal,
  nextStatus,
  statusMoment,
} from './purchaseOrderLadder';

// spec/purchase-orders rules § the status lifecycle, § what may be changed and
// when, and S18's confirmations. The t()-backed strings are asserted as
// non-empty and as differing from one another, not by their English wording:
// this covers WHICH refusal or confirmation fires, which is the rule, while
// the copy stays the catalogue's.

const node = (over: Record<string, unknown> = {}) =>
  ({
    status: 'NEW',
    createdDatetime: '2026-01-01T00:00:00',
    requestApprovalDatetime: null,
    confirmedDatetime: null,
    sentDatetime: null,
    finalisedDatetime: null,
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

describe('the ladder', () => {
  it('holds all five states where the store requires authorisation', () => {
    expect(ladderFor(true)).toEqual([
      'NEW',
      'REQUEST_APPROVAL',
      'CONFIRMED',
      'SENT',
      'FINALISED',
    ]);
  });

  // Ready for approval exists ONLY where the store requires authorisation.
  it('omits Ready for approval where it does not', () => {
    expect(ladderFor(false)).toEqual(['NEW', 'CONFIRMED', 'SENT', 'FINALISED']);
  });
});

describe('the move offered', () => {
  it('is the next rung up', () => {
    expect(nextStatus('NEW', true)).toBe('REQUEST_APPROVAL');
    expect(nextStatus('CONFIRMED', true)).toBe('SENT');
    expect(nextStatus('SENT', true)).toBe('FINALISED');
  });

  it('skips the approval rung where the store does not require it', () => {
    expect(nextStatus('NEW', false)).toBe('CONFIRMED');
  });

  // A Finalised order offers no move at all.
  it('is nothing at all on a Finalised order', () => {
    expect(nextStatus('FINALISED', true)).toBeUndefined();
    expect(nextStatus('FINALISED', false)).toBeUndefined();
  });

  // Nothing server-side enforces the ladder, so an order CAN sit in a state
  // its store no longer offers. It must still have somewhere to go.
  it('is the rung above an off-ladder state, not nothing', () => {
    expect(nextStatus('REQUEST_APPROVAL', false)).toBe('CONFIRMED');
  });
});

describe('which rung reads as current', () => {
  it('is the state’s own position', () => {
    expect(currentStep('NEW', true)).toBe(0);
    expect(currentStep('CONFIRMED', true)).toBe(2);
    expect(currentStep('CONFIRMED', false)).toBe(1);
  });

  it('is the last rung reached for an off-ladder state', () => {
    // REQUEST_APPROVAL in a store that does not offer it reads as New —
    // progress made, not a reset.
    expect(currentStep('REQUEST_APPROVAL', false)).toBe(0);
  });
});

describe('a state’s moment', () => {
  it('is the creation moment for New', () => {
    expect(statusMoment(node(), 'NEW')).toBe('2026-01-01T00:00:00');
  });

  it('is undefined for a state never entered', () => {
    expect(statusMoment(node(), 'FINALISED')).toBeUndefined();
  });

  // A moment is stored independently of the state, so one survives a move
  // backwards.
  it('survives on an order that has moved backwards', () => {
    expect(
      statusMoment(
        node({ status: 'NEW', confirmedDatetime: '2026-02-02T00:00:00' }),
        'CONFIRMED'
      )
    ).toBe('2026-02-02T00:00:00');
  });

  // The sent moment is the exception: the panel takes it by hand before the
  // order is Sent and a backwards move clears no moment, so an order may carry
  // one in ANY state — the ladder shows it only once the order is actually Sent.
  it('withholds the sent moment until the order is Sent', () => {
    expect(
      statusMoment(
        node({ status: 'NEW', sentDatetime: '2026-03-03T00:00:00' }),
        'SENT'
      )
    ).toBeUndefined();
    expect(
      statusMoment(
        node({ status: 'FINALISED', sentDatetime: '2026-03-03T00:00:00' }),
        'SENT'
      )
    ).toBe('2026-03-03T00:00:00');
  });
});

describe('what may be changed, and when', () => {
  it('opens the order’s fields for the three drafting states only', () => {
    expect(isOpenToChange('NEW')).toBe(true);
    expect(isOpenToChange('REQUEST_APPROVAL')).toBe(true);
    expect(isOpenToChange('CONFIRMED')).toBe(true);
    expect(isOpenToChange('SENT')).toBe(false);
    expect(isOpenToChange('FINALISED')).toBe(false);
  });

  it('takes the sent date by hand in every state before Sent', () => {
    expect(canEnterSentDate('NEW')).toBe(true);
    expect(canEnterSentDate('REQUEST_APPROVAL')).toBe(true);
    expect(canEnterSentDate('CONFIRMED')).toBe(true);
    expect(canEnterSentDate('SENT')).toBe(false);
    expect(canEnterSentDate('FINALISED')).toBe(false);
  });

  it('keeps the post-sending dates open until the order is Finalised', () => {
    expect(canRecordPostSendingDates('NEW')).toBe(true);
    expect(canRecordPostSendingDates('CONFIRMED')).toBe(true);
    expect(canRecordPostSendingDates('SENT')).toBe(true);
    expect(canRecordPostSendingDates('FINALISED')).toBe(false);
  });

  it('allows line authoring, deletion and attachments on their own windows', () => {
    expect(canAuthorLines('CONFIRMED')).toBe(false);
    expect(canAuthorLines('REQUEST_APPROVAL')).toBe(true);
    expect(canDelete('CONFIRMED')).toBe(false);
    expect(canAttachDocuments('CONFIRMED')).toBe(true);
    expect(canAttachDocuments('SENT')).toBe(false);
  });

  // Closing for receipt is a SENT-only action, and the only surface in the app
  // that changes a line's status.
  it('offers closing for receipt on a Sent order alone', () => {
    expect(canCloseLines('SENT')).toBe(true);
    expect(canCloseLines('CONFIRMED')).toBe(false);
    expect(canCloseLines('FINALISED')).toBe(false);
  });

  // The currency rule is NOT a state rule: it keys on the confirmation moment.
  it('fixes the currency on a confirmation moment, not a state', () => {
    expect(canChangeCurrency(node({ status: 'CONFIRMED' }))).toBe(true);
    expect(
      canChangeCurrency(
        node({ status: 'NEW', confirmedDatetime: '2026-02-02T00:00:00' })
      )
    ).toBe(false);
  });
});

describe('the two refusals that never reach a dialog', () => {
  const gates = {
    target: 'CONFIRMED' as const,
    authorisationRequired: false,
    canAuthorise: true,
    lineCount: 3,
    emptyLineCount: 0,
  };

  it('lets a move through when nothing blocks it', () => {
    expect(moveRefusal(gates)).toBeUndefined();
  });

  it('declines an order with no lines', () => {
    expect(moveRefusal({ ...gates, lineCount: 0 })).toBeTruthy();
  });

  it('declines an order carrying a line with no quantity', () => {
    expect(moveRefusal({ ...gates, emptyLineCount: 1 })).toBeTruthy();
  });

  it('declines Ready for sending without the authorise permission', () => {
    expect(
      moveRefusal({
        ...gates,
        authorisationRequired: true,
        canAuthorise: false,
      })
    ).toBeTruthy();
  });

  // The permission gates ENTERING Ready for sending, not every move.
  it('does not apply the authorise gate to another move', () => {
    expect(
      moveRefusal({
        ...gates,
        target: 'SENT',
        authorisationRequired: true,
        canAuthorise: false,
      })
    ).toBeUndefined();
  });

  it('reports the empty-line refusal even where the permission is missing too', () => {
    const both = moveRefusal({
      ...gates,
      lineCount: 0,
      authorisationRequired: true,
      canAuthorise: false,
    });
    expect(both).toBe(moveRefusal({ ...gates, lineCount: 0 }));
  });
});

describe('the confirmation a move raises', () => {
  it('asks the plain question for an ordinary move', () => {
    const confirmation = moveConfirmation('SENT', false);
    expect(confirmation.message).toBeTruthy();
    expect(confirmation.note).toBeUndefined();
    expect(confirmation.confirmLabel).toBeUndefined();
  });

  // Entering Ready for sending also says what that state means.
  it('adds the informational note for Ready for sending', () => {
    expect(moveConfirmation('CONFIRMED', false).note).toBeTruthy();
  });

  // Finalising warns that it cannot be undone, and carries its own verb.
  it('warns and renames the confirm for finalising', () => {
    const confirmation = moveConfirmation('FINALISED', false);
    expect(confirmation.confirmLabel).toBeTruthy();
    expect(confirmation.note).toBeUndefined();
  });

  // And warns DIFFERENTLY while stock is still owed — finalising closes those
  // lines for receiving.
  it('warns differently while stock is still owed', () => {
    expect(moveConfirmation('FINALISED', true).message).not.toBe(
      moveConfirmation('FINALISED', false).message
    );
    expect(moveConfirmation('FINALISED', true).confirmLabel).toBe(
      moveConfirmation('FINALISED', false).confirmLabel
    );
  });
});
