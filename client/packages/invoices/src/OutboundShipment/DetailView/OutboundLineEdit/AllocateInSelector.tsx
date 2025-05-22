import React from 'react';
import {
  useTranslation,
  Select,
  usePreference,
  PreferenceKey,
  useIntlUtils,
  useFormatNumber,
} from '@openmsupply-client/common';
import {
  AllocateInType,
  useAllocationContext,
} from './allocation/useAllocationContext';
import { canAutoAllocate } from './allocation/utils';

export const AllocateInSelector = () => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const { getPlural } = useIntlUtils();

  const { data: prefs } = usePreference(PreferenceKey.ManageVaccinesInDoses);

  const { allocateIn, availablePackSizes, setAllocateIn, item } =
    useAllocationContext(({ allocateIn, draftLines, item, setAllocateIn }) => ({
      item,
      allocateIn,
      setAllocateIn,
      availablePackSizes: [
        ...new Set(
          draftLines
            .filter(line => canAutoAllocate(line))
            .map(line => line.packSize)
        ),
      ].sort((a, b) => a - b),
    }));

  const unitName = item?.unitName ?? t('label.unit');
  const pluralisedUnitName = getPlural(unitName, 2);

  const options: { label: string; value: AllocateInType | number }[] = [
    // Always default to allocating in units
    {
      label: pluralisedUnitName,
      value: AllocateInType.Units,
    },
    // Then list available pack sizes
    ...availablePackSizes.map(packSize => ({
      label: t('label.packs-of-pack-size', { packSize }),
      value: packSize,
    })),
  ];

  // If can dispense in doses, give that option at the top of the list (smallest unit)
  if (item?.isVaccine && prefs?.manageVaccinesInDoses) {
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
