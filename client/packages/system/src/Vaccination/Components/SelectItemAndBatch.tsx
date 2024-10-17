import {
  InputWithLabelRow,
  Select,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import React, { PropsWithChildren, useEffect, useMemo } from 'react';
import { VaccinationDraft } from '../api';
import { VaccinationCourseDoseFragment } from '../api/operations.generated';
import { OTHER_FACILITY } from './FacilitySearchInput';
import { SelectBatch } from './SelectBatch';

export const SelectItemAndBatch = ({
  draft,
  dose,
  hasExistingSelectedBatch,
  updateDraft,
}: {
  dose: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  hasExistingSelectedBatch: boolean;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
}) => {
  const t = useTranslation('dispensary');

  const vaccineItemOptions = useMemo(() => {
    const options =
      dose?.vaccineCourse.vaccineCourseItems?.map(item => ({
        label: item.name,
        value: item.itemId,
      })) ?? [];

    // If the vaccine item for the selected stock line has since been deleted
    // Add to list so user can still see it
    if (!!draft.stockLine && !options.some(o => o.value === draft.itemId)) {
      options.push({
        label: draft.stockLine.itemName ?? '',
        value: draft.stockLine.itemId,
      });
    }

    return options;
  }, [dose.id]);

  const isHistorical = draft.date?.toDateString() !== new Date().toDateString();

  const selectBatch =
    !isHistorical || draft.createTransactions || hasExistingSelectedBatch;

  // Auto-select if there is only one item (and not already selected)
  useEffect(() => {
    if (vaccineItemOptions.length === 1 && !draft.itemId) {
      updateDraft({ itemId: vaccineItemOptions[0]!.value });
    }
  }, [vaccineItemOptions]);

  if (!draft.given) {
    return null;
  }

  if (draft.facilityId === OTHER_FACILITY) {
    return <InfoText>{t('messages.no-transaction-other-facility')}</InfoText>;
  }

  if (!vaccineItemOptions.length) {
    return <InfoText>{t('messages.no-vaccine-items-configured')}</InfoText>;
  }

  return (
    <>
      {selectBatch && (
        <>
          <InputWithLabelRow
            label={t('label.vaccine-item')}
            Input={
              <Select
                clearable
                options={vaccineItemOptions}
                value={draft.itemId ?? ''}
                onChange={e =>
                  updateDraft({ itemId: e.target.value, stockLine: null })
                }
                sx={{ flex: 1 }}
              />
            }
          />
          {draft.itemId && (
            <SelectBatch
              itemId={draft.itemId}
              stockLine={draft.stockLine ?? null}
              setStockLine={stockLine => updateDraft({ stockLine })}
            />
          )}
        </>
      )}
    </>
  );
};

const InfoText = ({ children }: PropsWithChildren<{}>) => (
  <Typography fontStyle="italic" color="gray.dark" fontSize={'small'}>
    {children}
  </Typography>
);
