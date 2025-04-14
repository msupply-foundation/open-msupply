import {
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  InvoiceNodeType,
} from '@common/types';
import { createDraftPrescriptionLine } from '../../api/hooks/utils';
import { FnUtils } from '@common/utils';
import { generateLabel, groupItems } from './utils';
import {
  PrescriptionLineFragment,
  PrescriptionRowFragment,
  WarningFragment,
} from '../../api';

type TestLineParams = {
  id?: string;
  itemId?: string;
  itemName?: string;
  packSize?: number;
  totalNumberOfPacks?: number;
  availableNumberOfPacks?: number;
  numberOfPacks?: number;
  prescribedQuantity?: number;
  onHold?: boolean;
  expiryDate?: string;
  note?: string;
  batch?: string;
  warnings?: WarningFragment[];
};

const createTestLine = ({
  itemId = FnUtils.generateUUID(),
  packSize = 1,
  totalNumberOfPacks = 1,
  availableNumberOfPacks = 1,
  numberOfPacks = 0,
  prescribedQuantity = 0,
  itemName = '',
  id = FnUtils.generateUUID(),
  onHold = false,
  expiryDate,
  note = '',
  batch = FnUtils.generateUUID(),
  warnings = [],
}: TestLineParams): PrescriptionLineFragment =>
  createDraftPrescriptionLine({
    invoiceId: '',
    invoiceStatus: InvoiceNodeStatus.New,
    invoiceLine: {
      id,
      totalAfterTax: 0,
      totalBeforeTax: 0,
      sellPricePerPack: 0,
      costPricePerPack: 0,
      itemName,
      item: {
        id: itemId,
        code: '',
        name: '',
        unitName: 'tablet',
        __typename: 'ItemNode',
        itemDirections: [
          {
            __typename: 'ItemDirectionNode',
            directions: 'Take one in the morning',
            id: '',
            itemId: '',
            priority: 1,
          },
        ],
        warnings,
      },
      type: InvoiceLineNodeType.StockOut,
      packSize,
      invoiceId: '',
      __typename: 'InvoiceLineNode',
      numberOfPacks,
      prescribedQuantity,
      expiryDate,
      note,
      batch,
      stockLine: {
        __typename: 'StockLineNode',
        id: 'a',
        totalNumberOfPacks,
        availableNumberOfPacks,
        onHold,
        sellPricePerPack: 0,
        costPricePerPack: 0,
        itemId,
        packSize,
        item: {
          code: '',
          name: 'Ibuprofen',
          __typename: 'ItemNode',
          itemDirections: [
            {
              __typename: 'ItemDirectionNode',
              directions: 'Take one in the morning',
              id: '',
              itemId: '',
              priority: 1,
            },
          ],
          warnings,
        },
      },
    },
  });

const createTestPrescription = (): PrescriptionRowFragment => {
  // this generates a line to satisfy the PrescriptionRowFragment type - not used for the labels
  const prescriptionLine = createTestLine({
    id: 'test',
    itemId: 'test',
    itemName: 'test item',
    note: 'test item note',
    numberOfPacks: 1,
    packSize: 1,
  });

  return {
    __typename: 'InvoiceNode',
    id: '1',
    invoiceNumber: 1,
    otherPartyName: '',
    createdDatetime: new Date().toISOString(),
    type: InvoiceNodeType.Prescription,
    currencyRate: 0,
    status: InvoiceNodeStatus.Picked,
    patientId: '',
    pricing: {
      __typename: 'PricingNode',
      totalAfterTax: 0,
      totalBeforeTax: 0,
      stockTotalBeforeTax: 0,
      stockTotalAfterTax: 0,
      serviceTotalAfterTax: 0,
      serviceTotalBeforeTax: 0,
      taxPercentage: 0,
    },
    clinician: {
      __typename: 'ClinicianNode',
      id: 'id',
      firstName: 'firstName',
      lastName: 'lastName',
    },
    lines: {
      __typename: 'InvoiceLineConnector',
      totalCount: 0,
      nodes: [prescriptionLine],
    },
    patient: {
      __typename: 'PatientNode',
      id: 'patient id',
      name: 'Patient A',
      code: 'code',
      isDeceased: false,
    },
  };
};

describe('generate labels from prescribed items', () => {
  /* **********************************************************
   input lines:
    [{
      id: '1',
      itemId: '1',
      itemName: 'Ibuprofen',
      batch: 'a',
      note: 'first note',
      numberOfPacks: 2,
      packSize: 100,
    },
    { 
      id: '2',
      itemId: '1',
      itemName: 'Ibuprofen',
      batch: 'b',
      note: 'second note',
      numberOfPacks: 3,
      packSize: 100,
    }]
   * 
   expected:     
    [{
      id: '1',
      sum: 500,
      itemDirections: 'first note',
      unitName: 'tablet',
      name: 'Ibuprofen',
      warning: '',
    }]
   ********************************************************** */
  it('creates one item label from multiple batches of the same item', () => {
    const one = createTestLine({
      id: '1',
      itemId: '1',
      itemName: 'Ibuprofen',
      batch: 'a',
      note: 'first note',
      numberOfPacks: 2,
      packSize: 100,
    });
    const two = createTestLine({
      id: '2',
      itemId: '1',
      itemName: 'Ibuprofen',
      batch: 'b',
      note: 'second note',
      numberOfPacks: 3,
      packSize: 100,
    });

    const draftPrescriptionLines = [one, two];
    const generate = groupItems(draftPrescriptionLines);

    const labelOne = {
      id: '1',
      sum: 500,
      itemDirections: 'first note',
      unitName: 'tablet',
      name: 'Ibuprofen',
      warning: '',
    };

    const expected = [labelOne];
    const generated = generate;

    expect(generated).toEqual(expected);
  });

  /* **********************************************************
     input lines:
      [{
        id: '1',
        itemId: '1',
        itemName: 'Ibuprofen',
        batch: 'a',
        note: '',
        numberOfPacks: 2,
        packSize: 100,
      },
      { 
        id: '2',
        itemId: '1',
        itemName: 'Ibuprofen',
        batch: 'b',
        note: 'second note',
        numberOfPacks: 3,
        packSize: 100,
      }]
     
     expected:     
      [{
        id: '1',
        sum: 500,
        itemDirections: 'second note',
        unitName: 'tablet',
        name: 'Ibuprofen',
        warning: '',
      }]
     ********************************************************** */
  it('will include directions on the result if some batches are missing directions', () => {
    const one = createTestLine({
      id: '1',
      itemId: '1',
      itemName: 'Ibuprofen',
      batch: 'a',
      note: '',
      numberOfPacks: 2,
      packSize: 100,
    });
    const two = createTestLine({
      id: '2',
      itemId: '1',
      itemName: 'Ibuprofen',
      batch: 'b',
      note: 'second note',
      numberOfPacks: 3,
      packSize: 100,
    });

    const draftPrescriptionLines = [one, two];
    const generate = groupItems(draftPrescriptionLines);

    const labelOne = {
      id: '1',
      sum: 500,
      itemDirections: 'second note',
      unitName: 'tablet',
      name: 'Ibuprofen',
      warning: '',
    };

    const expected = [labelOne];
    const generated = generate;

    expect(generated).toEqual(expected);
  });

  /* **********************************************************
     input lines:
    [{
      id: '1',
      itemId: '1',
      itemName: 'Ibuprofen',
      note: 'first item note',
      numberOfPacks: 2,
      packSize: 100,
    }
    const two = createTestLine({
      id: '2',
      itemId: '2',
      itemName: 'Amoxicillin',
      note: 'second item note',
      numberOfPacks: 3,
      packSize: 100,
    }]  
     
     expected:     
      [{
      id: '1',
      sum: 200,
      itemDirections: 'first item note',
      unitName: 'tablet',
      name: 'Ibuprofen',
      warning: '',
    },
    {
      id: '2',
      sum: 300,
      itemDirections: 'second item note',
      unitName: 'tablet',
      name: 'Amoxicillin',
      warning: '',
    }]
     ********************************************************** */
  it('will print a label for each item if the items are different', () => {
    const one = createTestLine({
      id: '1',
      itemId: '1',
      itemName: 'Ibuprofen',
      note: 'first item note',
      numberOfPacks: 2,
      packSize: 100,
    });
    const two = createTestLine({
      id: '2',
      itemId: '2',
      itemName: 'Amoxicillin',
      note: 'second item note',
      numberOfPacks: 3,
      packSize: 100,
    });

    const draftPrescriptionLines = [one, two];
    const generate = groupItems(draftPrescriptionLines);

    const labelOne = {
      id: '1',
      sum: 200,
      itemDirections: 'first item note',
      unitName: 'tablet',
      name: 'Ibuprofen',
      warning: '',
    };
    const labelTwo = {
      id: '2',
      sum: 300,
      itemDirections: 'second item note',
      unitName: 'tablet',
      name: 'Amoxicillin',
      warning: '',
    };

    const expected = [labelOne, labelTwo];
    const generated = generate;

    expect(generated).toEqual(expected);
  });
  /* **********************************************************
     input lines:
    [{
      id: '1',
      itemId: '1',
      itemName: 'Ibuprofen',
      note: 'first item note',
      numberOfPacks: 2,
      packSize: 100,
     warnings: [
      {
        code: '123',
        id: 'one',
        itemId: '1',
        priority: false,
        warningText: 'This is a low priority warning',
        __typename: 'WarningNode',
      },
      {
        code: 'code',
        id: 'two',
        itemId: '1',
        priority: true,
        warningText: 'Higher priority warning!!!',
        __typename: 'WarningNode',
      },
    ];
    }
     expected:     
      [{
      id: '1',
      sum: 200,
      itemDirections: 'first item note',
      unitName: 'tablet',
      name: 'Ibuprofen',
      warning: 'Higher priority warning!!!',
    },
     ********************************************************** */
  it('will print the highest priority warning for an item', () => {
    const warnings: WarningFragment[] = [
      {
        code: '123',
        id: 'one',
        itemId: '1',
        priority: false,
        warningText: 'This is a low priority warning',
        __typename: 'WarningNode',
      },
      {
        code: 'code',
        id: 'two',
        itemId: '1',
        priority: true,
        warningText: 'Higher priority warning!!!',
        __typename: 'WarningNode',
      },
    ];

    const one = createTestLine({
      id: '1',
      itemId: '1',
      itemName: 'Ibuprofen',
      note: 'first item note',
      numberOfPacks: 2,
      packSize: 100,
      warnings: warnings,
    });

    const draftPrescriptionLines = [one];
    const generate = groupItems(draftPrescriptionLines);

    const labelOne = {
      id: '1',
      sum: 200,
      itemDirections: 'first item note',
      unitName: 'tablet',
      name: 'Ibuprofen',
      warning: 'Higher priority warning!!!',
    };

    const expected = [labelOne];
    const generated = generate;

    expect(generated).toEqual(expected);
  });

  /* **********************************************************
   input lines:
    [{
        id: '1',
        sum: 500,
        itemDirections: 'first item note',
        unitName: 'tablet',
        name: 'Ibuprofen',
        warning: 'Higher priority warning!',
      },
      {
        id: '2',
        sum: 300,
        itemDirections: 'second item note',
        unitName: 'tablet',
        name: 'Amoxicillin',
      }]
   
   expected:     
    [{
      itemDetails: '500 tablet Ibuprofen',
      itemDirections: 'first item note',
      patientDetails: 'Patient A - code',
      details: 'Test Store - {date} - lastName, firstName',
      warning: 'Higher priority warning!',
    },
    {
      itemDetails: '300 tablet Amoxicillin',
      itemDirections: 'second item note',
      patientDetails: 'Patient A - code',
      details: 'Test Store - {date} - lastName, firstName',
    }]
   ********************************************************** */
  it('creates a formatted label for each item', () => {
    const item = [
      {
        id: '1',
        sum: 500,
        itemDirections: 'first item note',
        unitName: 'tablet',
        name: 'Ibuprofen',
        warning: 'Higher priority warning!',
      },
      {
        id: '2',
        sum: 300,
        itemDirections: 'second item note',
        unitName: 'tablet',
        name: 'Amoxicillin',
        warning: '',
      },
    ];

    const store = 'Test Store';
    const prescription = createTestPrescription();
    const generate = generateLabel(item, prescription, store);

    const labelOne = {
      itemDetails: '500 tablet Ibuprofen',
      itemDirections: 'first item note',
      patientDetails: 'Patient A - code',
      details: `Test Store - ${new Date(prescription.createdDatetime).toLocaleDateString()} - lastName, firstName`,
      warning: 'Higher priority warning!',
    };
    const labelTwo = {
      itemDetails: '300 tablet Amoxicillin',
      itemDirections: 'second item note',
      patientDetails: 'Patient A - code',
      details: `Test Store - ${new Date(prescription.createdDatetime).toLocaleDateString()} - lastName, firstName`,
      warning: '',
    };

    const expected = [labelOne, labelTwo];
    const generated = generate;

    expect(generated).toEqual(expected);
  });
});
