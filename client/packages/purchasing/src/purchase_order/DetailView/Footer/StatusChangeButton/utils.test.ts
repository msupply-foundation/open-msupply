import { PurchaseOrderNodeStatus } from '@common/types';
import {
  enableNextOptions,
  getNextStatusOption,
  getStatusOptions,
  PurchaseOrderStatusOption,
} from './utils';

describe('enableNextOptions', () => {
  const requiresAuthorisation = true;

  const createOptions = (): PurchaseOrderStatusOption[] => [
    { value: PurchaseOrderNodeStatus.New, label: 'New', isDisabled: true },
    {
      value: PurchaseOrderNodeStatus.Confirmed,
      label: 'Confirmed',
      isDisabled: true,
    },
    {
      value: PurchaseOrderNodeStatus.Finalised,
      label: 'Finalised',
      isDisabled: true,
    },
  ];

  it('should enable Confirm option when status is New and does not require authorisation', () => {
    const options = createOptions();
    enableNextOptions(
      options,
      PurchaseOrderNodeStatus.New,
      !requiresAuthorisation
    );
    expect(options[0]?.label).toBe('New');
    expect(options[0]?.isDisabled).toBe(true);

    expect(options[1]?.label).toBe('Confirmed');
    expect(options[1]?.isDisabled).toBe(false);

    expect(options[2]?.label).toBe('Finalised');
    expect(options[2]?.isDisabled).toBe(true);
  });

  it('should enable Confirmed option when status is Authorised', () => {
    const options = createOptions();
    const optionsWithAuthorised: PurchaseOrderStatusOption[] = [
      options[0] as PurchaseOrderStatusOption,
      {
        value: PurchaseOrderNodeStatus.Authorised,
        label: 'Authorised',
        isDisabled: true,
      },
      ...options.slice(1),
    ];

    enableNextOptions(
      optionsWithAuthorised,
      PurchaseOrderNodeStatus.Authorised,
      requiresAuthorisation
    );
    expect(optionsWithAuthorised[0]?.label).toBe('New');
    expect(optionsWithAuthorised[0]?.isDisabled).toBe(true);

    expect(optionsWithAuthorised[1]?.label).toBe('Authorised');
    expect(optionsWithAuthorised[1]?.isDisabled).toBe(true);

    expect(optionsWithAuthorised[2]?.label).toBe('Confirmed');
    expect(optionsWithAuthorised[2]?.isDisabled).toBe(false);

    expect(optionsWithAuthorised[3]?.label).toBe('Finalised');
    expect(optionsWithAuthorised[3]?.isDisabled).toBe(true);
  });

  it('should enable Finalised option when status is Confirmed', () => {
    const options = createOptions();
    enableNextOptions(
      options,
      PurchaseOrderNodeStatus.Confirmed,
      !requiresAuthorisation
    );
    expect(options[0]?.label).toBe('New');
    expect(options[0]?.isDisabled).toBe(true);

    expect(options[1]?.label).toBe('Confirmed');
    expect(options[1]?.isDisabled).toBe(true);

    expect(options[2]?.label).toBe('Finalised');
    expect(options[2]?.isDisabled).toBe(false);
  });

  it('should not enable options for Finalised status', () => {
    const options = createOptions();
    enableNextOptions(
      options,
      PurchaseOrderNodeStatus.Finalised,
      !requiresAuthorisation
    );

    expect(options[0]?.label).toBe('New');
    expect(options[0]?.isDisabled).toBe(true);

    expect(options[1]?.label).toBe('Confirmed');
    expect(options[1]?.isDisabled).toBe(true);

    expect(options[2]?.label).toBe('Finalised');
    expect(options[2]?.isDisabled).toBe(true);
  });
});

describe('getStatusOptions', () => {
  const requiresAuthorisation = true;

  it('should return empty array when currentStatus is undefined', () => {
    const options = getStatusOptions(
      undefined,
      () => 'Value',
      requiresAuthorisation
    );
    expect(options).toEqual([]);
  });

  it('should return options', () => {
    const options = getStatusOptions(
      PurchaseOrderNodeStatus.New,
      () => 'Value',
      !requiresAuthorisation
    );

    expect(options).toHaveLength(3);
    expect(options[0]?.value).toBe(PurchaseOrderNodeStatus.New);
    expect(options[0]?.isDisabled).toBe(true);

    expect(options[1]?.value).toBe(PurchaseOrderNodeStatus.Confirmed);
    expect(options[1]?.isDisabled).toBe(false);

    expect(options[2]?.value).toBe(PurchaseOrderNodeStatus.Finalised);
    expect(options[2]?.isDisabled).toBe(true);
  });

  it('should return options with authorisation', () => {
    const options = getStatusOptions(
      PurchaseOrderNodeStatus.New,
      () => 'Value',
      requiresAuthorisation
    );

    expect(options).toHaveLength(4);
    expect(options[0]?.value).toBe(PurchaseOrderNodeStatus.New);
    expect(options[0]?.isDisabled).toBe(true);

    expect(options[1]?.value).toBe(PurchaseOrderNodeStatus.Authorised);
    expect(options[1]?.isDisabled).toBe(false);

    expect(options[2]?.value).toBe(PurchaseOrderNodeStatus.Confirmed);
    expect(options[2]?.isDisabled).toBe(true);

    expect(options[3]?.value).toBe(PurchaseOrderNodeStatus.Finalised);
    expect(options[3]?.isDisabled).toBe(true);
  });
});

describe('getNextStatusOption', () => {
  const requiresAuthorisation = true;

  const createOptions = (): PurchaseOrderStatusOption[] => [
    { value: PurchaseOrderNodeStatus.New, label: 'New', isDisabled: true },
    {
      value: PurchaseOrderNodeStatus.Confirmed,
      label: 'Confirmed',
      isDisabled: true,
    },
    {
      value: PurchaseOrderNodeStatus.Finalised,
      label: 'Finalised',
      isDisabled: true,
    },
  ];

  it('should return null when status is undefined', () => {
    const options: PurchaseOrderStatusOption[] = [];
    const nextOption = getNextStatusOption(
      undefined,
      options,
      requiresAuthorisation
    );
    expect(nextOption).toBeNull();
  });

  it('should return the next status option based on current status', () => {
    const options = createOptions();
    const nextOption = getNextStatusOption(
      PurchaseOrderNodeStatus.Confirmed,
      options,
      !requiresAuthorisation
    );
    expect(nextOption?.value).toBe(PurchaseOrderNodeStatus.Finalised);
  });

  it('should handle Authorised status correctly', () => {
    const options = createOptions();
    const optionsWithAuthorised: PurchaseOrderStatusOption[] = [
      options[0] as PurchaseOrderStatusOption,
      {
        value: PurchaseOrderNodeStatus.Authorised,
        label: 'Authorised',
        isDisabled: true,
      },
      ...options.slice(1),
    ];

    const nextOption = getNextStatusOption(
      PurchaseOrderNodeStatus.Authorised,
      optionsWithAuthorised,
      requiresAuthorisation
    );
    expect(nextOption?.value).toBe(PurchaseOrderNodeStatus.Confirmed);
  });

  it('should return Confirmed option when status is Authorised but requiresAuthorisation is false', () => {
    const options = createOptions();
    const optionsWithAuthorised: PurchaseOrderStatusOption[] = [
      options[0] as PurchaseOrderStatusOption,
      {
        value: PurchaseOrderNodeStatus.Authorised,
        label: 'Authorised',
        isDisabled: true,
      },
      ...options.slice(1),
    ];

    const nextOption = getNextStatusOption(
      PurchaseOrderNodeStatus.Authorised,
      optionsWithAuthorised,
      !requiresAuthorisation
    );
    expect(nextOption?.value).toBe(PurchaseOrderNodeStatus.Confirmed);
  });
});
