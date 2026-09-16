import { isReasonDisabled } from './utils';

describe('isReasonDisabled', () => {
  const variance = { requestedQuantity: 10, suggestedQuantity: 4 };

  it('locks when the requisition is not editable', () => {
    expect(
      isReasonDisabled({ disabled: true, isLinked: false, ...variance })
    ).toBe(true);
  });

  it('locks when requested equals suggested (no variance to explain)', () => {
    expect(
      isReasonDisabled({
        disabled: false,
        isLinked: false,
        requestedQuantity: 4,
        suggestedQuantity: 4,
      })
    ).toBe(true);
  });

  it('locks with no draft loaded yet', () => {
    expect(isReasonDisabled({ disabled: false, isLinked: true })).toBe(true);
  });

  describe('a requisition this store created', () => {
    it('stays editable at a variance, with or without a saved reason', () => {
      expect(
        isReasonDisabled({ disabled: false, isLinked: false, ...variance })
      ).toBe(false);
      expect(
        isReasonDisabled({
          disabled: false,
          isLinked: false,
          savedReasonId: 'reason-a',
          ...variance,
        })
      ).toBe(false);
    });
  });

  describe("a requisition transferred from a customer's internal order", () => {
    it("locks the customer's reason once one is saved (#11316)", () => {
      expect(
        isReasonDisabled({
          disabled: false,
          isLinked: true,
          savedReasonId: 'reason-a',
          ...variance,
        })
      ).toBe(true);
    });

    it('stays editable when the line arrived with a variance but no reason', () => {
      // Otherwise the server rejects every save of the line and the finalise
      // of the requisition, with no way for the supplier to get past it.
      expect(
        isReasonDisabled({ disabled: false, isLinked: true, ...variance })
      ).toBe(false);
      expect(
        isReasonDisabled({
          disabled: false,
          isLinked: true,
          savedReasonId: null,
          ...variance,
        })
      ).toBe(false);
    });
  });
});
