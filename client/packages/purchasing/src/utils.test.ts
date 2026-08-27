import { isFieldDisabled, StatusGroup } from './utils';
import { PurchaseOrderNodeStatus } from '@openmsupply-client/common';

describe('isFieldDisabled', () => {
  it('returns false when status is not in the disabled group (field is editable)', () => {
    expect(
      isFieldDisabled(PurchaseOrderNodeStatus.New, StatusGroup.AfterConfirmed)
    ).toBe(false);
    expect(
      isFieldDisabled(
        PurchaseOrderNodeStatus.RequestApproval,
        StatusGroup.AfterConfirmed
      )
    ).toBe(false);
  });

  it('returns true when status is in the disabled group (field is disabled)', () => {
    expect(
      isFieldDisabled(
        PurchaseOrderNodeStatus.Confirmed,
        StatusGroup.AfterConfirmed
      )
    ).toBe(true);
    expect(
      isFieldDisabled(PurchaseOrderNodeStatus.Sent, StatusGroup.AfterConfirmed)
    ).toBe(true);
    expect(
      isFieldDisabled(
        PurchaseOrderNodeStatus.Finalised,
        StatusGroup.AfterConfirmed
      )
    ).toBe(true);
  });

  it('returns true when status is FINALISED regardless of status group (early return)', () => {
    // Test all status groups to ensure FINALISED always returns true
    expect(
      isFieldDisabled(
        PurchaseOrderNodeStatus.Finalised,
        StatusGroup.BeforeConfirmed
      )
    ).toBe(true);
    expect(
      isFieldDisabled(
        PurchaseOrderNodeStatus.Finalised,
        StatusGroup.AfterConfirmed
      )
    ).toBe(true);
    expect(
      isFieldDisabled(PurchaseOrderNodeStatus.Finalised, StatusGroup.AfterSent)
    ).toBe(true);
  });
});
