import {
  InputWithLabelRow,
  Select,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import React, { PropsWithChildren, useMemo } from 'react';
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
    return (
      dose?.vaccineCourse.vaccineCourseItems?.map(item => ({
        label: item.name,
        value: item.itemId,
      })) ?? []
    );
  }, [dose.id]);

  if (!draft.given) {
    return null;
  }

  if (draft.facilityId === OTHER_FACILITY) {
    return <InfoText>{t('messages.no-transaction-other-facility')}</InfoText>;
  }

  if (!vaccineItemOptions.length) {
    return <InfoText>{t('messages.no-vaccine-items-configured')}</InfoText>;
  }

  const isHistorical = draft.date?.toDateString() !== new Date().toDateString();

  const selectBatch =
    !isHistorical || draft.createTransactions || hasExistingSelectedBatch;

  return (
    <>
      {selectBatch && (
        <>
          <InputWithLabelRow
            label={t('label.vaccine-item')}
            Input={
              <Select
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
