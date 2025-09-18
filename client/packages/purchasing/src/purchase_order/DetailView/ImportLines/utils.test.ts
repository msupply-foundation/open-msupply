import { PurchaseOrderLineStatusNode } from '@common/types';
import { ImportRow } from './utils';
import { getImportHelpers, ParsedLine } from './utils';

describe('testCombinationHelperFunctions', () => {
  it('end to end combination test', () => {
    const rows: ImportRow[] = [
      {
        id: '1',
        itemCode: 'A123',
        requestedPackSize: 10,
        requestedNumberOfUnits: 100,
        purchaseOrderId: '',
        status: PurchaseOrderLineStatusNode.New,
        unit: '',
        supplierItemCode: '',
        pricePerUnitBeforeDiscount: 0,
        discountPercentage: 0,
        pricePerUnitAfterDiscount: 0,
        requestedDeliveryDate: '',
        expectedDeliveryDate: '',
        comment: '',
        note: '',
        errorMessage: '',
        warningMessage: '',
      },
      {
        id: '2',
        itemCode: 'B456',
        requestedPackSize: 20,
        requestedNumberOfUnits: 200,
        purchaseOrderId: '',
        status: PurchaseOrderLineStatusNode.New,
        unit: '',
        supplierItemCode: '',
        pricePerUnitBeforeDiscount: 0,
        discountPercentage: 0,
        pricePerUnitAfterDiscount: 0,
        requestedDeliveryDate: '',
        expectedDeliveryDate: '',
        comment: '',
        note: '',
        errorMessage: '',
        warningMessage: '',
      },
    ];

    const t = (key: string) => {
      switch (key) {
        case 'label.code':
          return 'Code';
        case 'label.pack-size':
          return 'Pack size';
        case 'label.requested':
          return 'Requested';
        default:
          return key;
      }
    };

    const row: ParsedLine = {
      id: '3',
      ['Code']: 'A123',
      ['Pack size']: '10',
      ['Requested']: '100',
      ['Line number']: '3',
    };

    const { addUniqueCombination, rowErrors } = getImportHelpers(
      row,
      rows,
      2,
      t
    );

    addUniqueCombination([
      {
        key: 'itemCode',
        localeKey: 'label.code',
      },
      {
        key: 'requestedPackSize',
        localeKey: 'label.pack-size',
        formatter: numString => parseFloat(numString),
      },
    ]);

    expect(rowErrors.length).toBe(1);
  });
});
