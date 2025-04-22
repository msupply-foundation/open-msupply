import {
  InputWithLabelRow,
  Select,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useEffect, useMemo } from 'react';
import { VaccinationDraft } from '../api';
import { VaccinationCourseDoseFragment } from '../api/operations.generated';

export const SelectItem = ({
  draft,
  dose,
  disabled,
  updateDraft,
}: {
  dose: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  disabled?: boolean;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
}) => {
  const t = useTranslation();

  const vaccineItemOptions = useMemo(() => {
    const options =
      dose?.vaccineCourse.vaccineCourseItems?.map(item => ({
        label: item.name,
        value: item.itemId,
      })) ?? [];

    // If given item has since been removed from vaccine course config
    // Add to list so user can still see it
    if (!!draft.item && !options.some(o => o.value === draft.itemId)) {
      options.push({
        label: draft.item.name,
        value: draft.item.id,
      });
    }

    return options;
  }, [dose.id]);

  // Auto-select if there is only one item (and not already selected)
  useEffect(() => {
    if (vaccineItemOptions.length === 1 && !draft.item) {
      updateDraft({ itemId: vaccineItemOptions[0]!.value });
    }
  }, [vaccineItemOptions]);

  if (!vaccineItemOptions.length) {
    return (
      <Typography fontStyle="italic" color="gray.dark" fontSize={'small'}>
        {t('messages.no-vaccine-items-configured')}
      </Typography>
    );
  }

  return (
    <InputWithLabelRow
      label={t('label.vaccine-item')}
      Input={
        <Select
          clearable
          options={vaccineItemOptions}
          disabled={disabled}
          value={draft.itemId ?? ''}
          onChange={e =>
            updateDraft({ itemId: e.target.value, stockLine: null })
          }
          sx={{ flex: 1 }}
        />
      }
    />
  );
};
