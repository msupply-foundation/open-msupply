import React from 'react';
import {
  useTranslation,
  Select,
  usePreferences,
  useIntlUtils,
  useFormatNumber,
  Typography,
} from '@openmsupply-client/common';
import { AllocateInType, useAllocationContext } from '../useAllocationContext';
import { canAutoAllocate } from '../utils';

export const AllocateInSelector = ({
  includePackSizeOptions = false,
}: {
  includePackSizeOptions?: boolean;
}) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { getPlural } = useIntlUtils();

  const { manageVaccinesInDoses, expiredStockIssueThreshold } =
    usePreferences();

  const { allocateIn, availablePackSizes, setAllocateIn, item } =
    useAllocationContext(({ allocateIn, draftLines, item, setAllocateIn }) => ({
      item,
      allocateIn,
      setAllocateIn,
      availablePackSizes: [
        ...new Set(
          draftLines
            .filter(line =>
              canAutoAllocate(line, expiredStockIssueThreshold ?? 0)
            )
            .map(line => line.packSize)
        ),
      ].sort((a, b) => a - b),
    }));

  const unitName = item?.unitName ?? t('label.unit');
  const pluralisedUnitName = getPlural(unitName, 2);

  const includeDosesOption = item?.isVaccine && manageVaccinesInDoses;

  // EARLY RETURN - if only allocating in units, don't show the selector
  if (
    (!includePackSizeOptions || !availablePackSizes.length) &&
    !includeDosesOption
  ) {
    return <Typography sx={{ fontSize: 12 }}>{pluralisedUnitName}</Typography>;
  }

  const options: { label: string; value: AllocateInType | number }[] = [
    // Always default to allocating in units
    {
      label: pluralisedUnitName,
      value: AllocateInType.Units,
    },
  ];

  if (includePackSizeOptions) {
    // Then list available pack sizes
    options.push(
      ...availablePackSizes.map(packSize => ({
        label: t('label.packs-of-pack-size', { packSize }),
        value: packSize,
      }))
    );
  }

  // If can dispense in doses, give that option at the top of the list (smallest unit)
  if (includeDosesOption) {
    options.unshift({
      label: t('label.doses'),
      value: AllocateInType.Doses,
    });
  }

  const handleAllocateInChange = (value: AllocateInType | number) => {
    if (typeof value === 'number') {
      setAllocateIn({ type: AllocateInType.Packs, packSize: value }, format, t);
    } else if (
      value === AllocateInType.Doses ||
      value === AllocateInType.Units
    ) {
      setAllocateIn({ type: value }, format, t);
    } else {
      console.error('Invalid value for allocateIn:', value);
    }
  };

  return (
    <Select
      options={options}
      value={
        allocateIn.type === AllocateInType.Packs
          ? allocateIn.packSize
          : allocateIn.type
      }
      onChange={e =>
        handleAllocateInChange(e.target.value as AllocateInType | number)
      }
      sx={{ width: '150px' }}
    />
  );
};
