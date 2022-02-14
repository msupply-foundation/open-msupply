import { DraftOutboundLine } from './../../../types';
import {
  createDraftOutboundLine,
  createPlaceholderRow,
} from './hooks/useDraftOutboundLines';
import { InvoiceNodeStatus } from '@openmsupply-client/common/';
import { allocateQuantities } from './utils';

type Params = Partial<Parameters<typeof createDraftOutboundLine>[0]>;

const getPackSizeOne = ({ invoiceLine, stockLine }: Params = {}) =>
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 1,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
      ...stockLine,
    },
    invoiceLine: { id: 'packSizeOne', numberOfPacks: 0, ...invoiceLine },
  });

const getPackSizeTwo = ({ invoiceLine, stockLine }: Params = {}) =>
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      ...stockLine,
      packSize: 2,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
    },
    invoiceLine: { id: 'packSizeTwo', numberOfPacks: 0, ...invoiceLine },
  });

const getPlaceholder = (
  line?: Partial<DraftOutboundLine>
): DraftOutboundLine => ({
  ...createPlaceholderRow(''),
  ...line,
});

describe('allocateQuantities - standard behaviour.', () => {
  it('allocates quantity to a row', () => {
    const draftOutboundLines = [
      getPackSizeOne({
        stockLine: { availableNumberOfPacks: 10, totalNumberOfPacks: 10 },
      }),
      getPlaceholder(),
    ];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineOne = getPackSizeOne({
      stockLine: { availableNumberOfPacks: 7, totalNumberOfPacks: 10 },
      invoiceLine: { numberOfPacks: 3 },
    });

    const placeholder = getPlaceholder();

    const expected = [lineOne, placeholder];

    expect(allocate(3, 1)).toEqual(expected);
  });

  it('allocates quantity spread over multiple lines', () => {
    const draftOutboundLines = [
      getPackSizeOne({ invoiceLine: { id: '1' } }),
      getPackSizeOne({ invoiceLine: { id: '2' } }),
      getPlaceholder(),
    ];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineOne = getPackSizeOne();
    lineOne.numberOfPacks = 1;
    lineOne.id = '1';
    const lineTwo = getPackSizeOne();
    lineTwo.numberOfPacks = 1;
    lineTwo.id = '2';
    const placeholder = getPlaceholder();

    const expected = [lineOne, lineTwo, placeholder];
    const allocated = allocate(2, 1);

    expect(allocated).toEqual(expected);
  });
});

describe('Allocate quantities - placeholder row behaviour', () => {
  it('allocates excess quantity to the placeholder row when the status is new', () => {
    const draftOutboundLines = [getPackSizeOne(), getPlaceholder()];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineOne = getPackSizeOne();
    lineOne.numberOfPacks = 1;
    const placeholder = getPlaceholder({ numberOfPacks: 9 });

    const expected = [lineOne, placeholder];

    expect(allocate(10, 1)).toEqual(expected);
  });

  it('allocates quantity spread over multiple lines and placeholders when there is excess', () => {
    const draftOutboundLines = [
      getPackSizeOne({ invoiceLine: { id: '1' } }),
      getPackSizeOne({ invoiceLine: { id: '2' } }),
      getPlaceholder(),
    ];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineOne = getPackSizeOne({ invoiceLine: { id: '1' } });
    lineOne.numberOfPacks = 1;
    const lineTwo = getPackSizeOne({ invoiceLine: { id: '2' } });
    lineTwo.numberOfPacks = 1;
    const placeholder = getPlaceholder();
    placeholder.numberOfPacks = 1;

    const expected = [lineOne, lineTwo, placeholder];

    expect(allocate(3, 1)).toEqual(expected);
  });

  it('does not allocate excess quantity to the placeholder row when the status is not new', () => {
    const run = (status: InvoiceNodeStatus) => {
      const draftOutboundLines = [getPackSizeOne(), getPlaceholder()];
      const allocate = allocateQuantities(status, draftOutboundLines);

      const lineOne = getPackSizeOne();
      lineOne.numberOfPacks = 1;
      const placeholder = getPlaceholder({ numberOfPacks: 0 });

      const expected = [lineOne, placeholder];
      return { allocate, expected };
    };

    const allocatedStatusTest = run(InvoiceNodeStatus.Allocated);
    expect(allocatedStatusTest.allocate(10, 1)).toEqual(
      allocatedStatusTest.expected
    );

    const pickedStatusTest = run(InvoiceNodeStatus.Picked);
    expect(pickedStatusTest.allocate(10, 1)).toEqual(pickedStatusTest.expected);

    const deliveredStatusTest = run(InvoiceNodeStatus.Delivered);
    expect(deliveredStatusTest.allocate(10, 1)).toEqual(
      allocatedStatusTest.expected
    );

    const verifiedStatusTest = run(InvoiceNodeStatus.Verified);
    expect(verifiedStatusTest.allocate(10, 1)).toEqual(
      allocatedStatusTest.expected
    );
  });
});

describe('Allocate quantities - differing pack size behaviour', () => {
  it('does not allocate any quantity to lines which are not of the pack size selected', () => {
    const draftOutboundLines = [
      getPackSizeOne(),
      getPackSizeTwo(),
      getPlaceholder(),
    ];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineOne = getPackSizeOne();
    lineOne.numberOfPacks = 1;
    const lineTwo = getPackSizeTwo();
    const placeholder = getPlaceholder();
    placeholder.numberOfPacks = 2;

    const expected = [lineOne, lineTwo, placeholder];

    expect(allocate(3, 1)).toEqual(expected);
  });

  it('after changing to a different pack size, all quantities allocated to the original pack size are removed.', () => {
    const draftOutboundLines = [
      getPackSizeOne(),
      getPackSizeTwo(),
      getPlaceholder(),
    ];
    let allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineOne = getPackSizeOne();
    lineOne.numberOfPacks = 1;
    const lineTwo = getPackSizeTwo();
    const placeholder = getPlaceholder();
    placeholder.numberOfPacks = 2;

    const expected = [lineOne, lineTwo, placeholder];

    expect(allocate(3, 1)).toEqual(expected);

    allocate = allocateQuantities(InvoiceNodeStatus.New, expected);
    const lineOneAfterChange = getPackSizeOne();
    const lineTwoAfterChange = getPackSizeTwo();
    lineTwoAfterChange.numberOfPacks = 1;
    const placeholderAfterChange = getPlaceholder();
    placeholderAfterChange.numberOfPacks = 4;
    const expectedAfterChange = [
      lineOneAfterChange,
      lineTwoAfterChange,
      placeholderAfterChange,
    ];

    expect(allocate(3, 2)).toEqual(expectedAfterChange);
  });
});

describe('Allocating quantities - behaviour when mixing placeholders and pack sizes greater than one', () => {
  it('issues any left over quantities to the placeholder at a pack size of 1 (the number of units) when issuing to pack sizes of one', () => {
    const draftOutboundLines = [getPackSizeOne(), getPlaceholder()];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineTwo = getPackSizeOne();
    lineTwo.numberOfPacks = 1;
    const placeholder = getPlaceholder();
    placeholder.numberOfPacks = 9;

    const expected = [lineTwo, placeholder];

    expect(allocate(10, 1)).toEqual(expected);
  });
  it('issues any left over quantities to the placeholder at a pack size of 1 (the number of units) when issuing to non-one pack sizes', () => {
    const draftOutboundLines = [getPackSizeTwo(), getPlaceholder()];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineTwo = getPackSizeTwo();
    lineTwo.numberOfPacks = 1;
    // The total number of units being allocated is 20. The line with a pack size of two has 1 pack available.
    // So, 18 units should be assigned to the placeholder - the 9 remaining packs * the pack size of two.
    const placeholder = getPlaceholder();
    placeholder.numberOfPacks = 18;

    const expected = [lineTwo, placeholder];

    expect(allocate(10, 2)).toEqual(expected);
  });
});

describe('Allocated quantities - expiry date behaviour', () => {
  const now = Date.now();
  const expiringFirstDate = new Date(now + 10000);
  const expiringLastDate = new Date(now + 100000);
  const expiringLastLine = getPackSizeOne({
    invoiceLine: { id: '1' },
    stockLine: {
      expiryDate: new Date(expiringLastDate).toISOString(),
      availableNumberOfPacks: 10,
      totalNumberOfPacks: 10,
    },
  });
  const expiringFirstLine = getPackSizeOne({
    invoiceLine: { id: '2' },
    stockLine: {
      expiryDate: new Date(expiringFirstDate).toISOString(),
      availableNumberOfPacks: 10,
      totalNumberOfPacks: 10,
    },
  });
  const placeholder = getPlaceholder();
  it('issues to lines with the earliest expiring invoice line', () => {
    const draftOutboundLines = [
      { ...expiringLastLine },
      { ...expiringFirstLine },
      { ...placeholder },
    ];

    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const expiringLast = { ...expiringLastLine };
    const expiringFirst = { ...expiringFirstLine, numberOfPacks: 10 };

    expect(allocate(10, 1)).toEqual([expiringLast, expiringFirst, placeholder]);
  });
  it('allocates units to the first expiry batch, with left overs being assigned to later expiring lines', () => {
    const draftOutboundLines = [
      { ...expiringLastLine },
      { ...expiringFirstLine },
      { ...placeholder },
    ];

    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const expiringLast = { ...expiringLastLine, numberOfPacks: 5 };
    const expiringFirst = { ...expiringFirstLine, numberOfPacks: 10 };

    expect(allocate(15, 1)).toEqual([expiringLast, expiringFirst, placeholder]);
  });
});

describe('Allocated quantities - behaviour for expiry dates mixed with pack sizes', () => {
  const now = Date.now();
  const expiringLastDate = new Date(now + 10000);
  const expiredDate = new Date(now - 100000);
  const expiringLastLine = getPackSizeOne({
    invoiceLine: { id: '1' },
    stockLine: {
      expiryDate: new Date(expiringLastDate).toISOString(),
      availableNumberOfPacks: 10,
      totalNumberOfPacks: 10,
    },
  });
  const expiredLine = getPackSizeOne({
    invoiceLine: { id: '2' },
    stockLine: {
      expiryDate: new Date(expiredDate).toISOString(),
      availableNumberOfPacks: 10,
      totalNumberOfPacks: 10,
    },
  });
  const placeholder = getPlaceholder();

  it('does not allocate any quantity to expired lines', () => {
    const draftOutboundLines = [
      { ...expiringLastLine },
      { ...expiredLine },
      { ...placeholder },
    ];

    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const expiringLast = { ...expiringLastLine, numberOfPacks: 10 };
    const expired = { ...expiredLine, numberOfPacks: 0 };

    expect(allocate(10, 1)).toEqual([expiringLast, expired, placeholder]);
  });
});

describe('Allocated quantities - behaviour generally not possible through the UI', () => {
  it('issues all quantities to the place holder when issuing to a pack size that has no available quantity', () => {
    const draftOutboundLines = [getPackSizeTwo(), getPlaceholder()];
    const allocate = allocateQuantities(
      InvoiceNodeStatus.New,
      draftOutboundLines
    );

    const lineTwo = getPackSizeTwo();
    const placeholder = getPlaceholder();
    placeholder.numberOfPacks = 10;

    const expected = [lineTwo, placeholder];

    expect(allocate(10, 1)).toEqual(expected);
  });
});
