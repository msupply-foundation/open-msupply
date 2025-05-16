import { FnUtils } from '@openmsupply-client/common';
import { canAutoAllocate } from './utils';
import { DraftStockOutLineFragment } from '../../../api/operations.generated';

describe('canAutoAllocate ', () => {
  it('canAutoAllocateTests', () => {
    const availableLine = createTestLine({ availablePacks: 10 });
    expect(canAutoAllocate(availableLine)).toEqual(true);

    const onHoldLine = createTestLine({
      availablePacks: 10,
      onHold: true,
    });
    expect(canAutoAllocate(onHoldLine)).toEqual(false);
    const expiredLine = createTestLine({
      availablePacks: 10,
      expiryDate: '2023-01-01',

      onHold: false,
    });
    expect(canAutoAllocate(expiredLine)).toEqual(false);

    const unusableVVMLine = createTestLine({
      availablePacks: 10,
      vvmStatus: { unusable: true },
    });
    expect(canAutoAllocate(unusableVVMLine)).toEqual(false);
    const usableVVMExpiredLine = createTestLine({
      availablePacks: 10,
      expiryDate: '2023-01-01',
      vvmStatus: { unusable: true },
    });
    expect(canAutoAllocate(usableVVMExpiredLine)).toEqual(false);

    const usableVVMLine = createTestLine({
      availablePacks: 10,
      vvmStatus: { unusable: false },
    });
    expect(canAutoAllocate(usableVVMLine)).toEqual(true);
  });
});

type TestLineParams = {
  id?: string;
  packSize?: number;
  availablePacks?: number;
  numberOfPacks?: number;
  onHold?: boolean;
  expiryDate?: string;
  vvmStatus?: { level?: number; unusable?: boolean } | null;
};

function createTestLine({
  id = FnUtils.generateUUID(),
  packSize = 1,
  availablePacks = 1,
  numberOfPacks = 0,
  onHold = false,
  expiryDate,
  vvmStatus = null,
}: TestLineParams): DraftStockOutLineFragment {
  return {
    __typename: 'DraftOutboundShipmentLineNode',
    id,
    stockLineId: '',
    numberOfPacks,
    packSize,
    sellPricePerPack: 0,
    inStorePacks: availablePacks,
    availablePacks,
    expiryDate,
    stockLineOnHold: onHold,
    vvmStatus: vvmStatus
      ? {
          __typename: 'VvmstatusNode',
          id: 'vvmStatusId' + id,
          level: 1,
          unusable: false,
          ...vvmStatus,
        }
      : null,
  };
}
