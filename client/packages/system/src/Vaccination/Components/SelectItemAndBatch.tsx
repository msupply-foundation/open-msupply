import {
  Button,
  InputWithLabelRow,
  Select,
  Switch,
  SxProps,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import React, { PropsWithChildren, useMemo, useState } from 'react';
import { VaccinationDraft } from '../api';
import { VaccinationCourseDoseFragment } from '../api/operations.generated';
import { OTHER_FACILITY } from './FacilitySearchInput';

export const SelectItemAndBatch = ({
  draft,
  dose,
  hasExistingSelectedBatch,
  updateDraft,
  openBatchModal,
}: {
  dose: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  hasExistingSelectedBatch: boolean;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
  openBatchModal: () => void;
}) => {
  const t = useTranslation('dispensary');
  const [recordHistoricalBatch, setRecordBatch] = useState(false);

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
    !isHistorical || recordHistoricalBatch || hasExistingSelectedBatch;

  return (
    <>
      {isHistorical && !hasExistingSelectedBatch && (
        <Switch
          label={t('label.record-stock-transaction')}
          checked={recordHistoricalBatch}
          onChange={() => setRecordBatch(!recordHistoricalBatch)}
          labelPlacement="end"
          size="small"
        />
      )}

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
          <InputWithLabelRow
            label={t('label.batch')}
            Input={
              <Button
                disabled={!draft.itemId}
                onClick={() => draft.itemId && openBatchModal()}
                sx={{
                  ...baseButtonStyles,
                  // !draft.itemId === disabled
                  color: draft.itemId ? 'gray.main' : 'gray.light',
                  backgroundColor: draft.itemId && 'background.menu',
                  // stock line is selected
                  fontStyle: draft.stockLine ? 'none' : 'italic',
                }}
              >
                {draft.stockLine
                  ? (draft.stockLine.batch ?? t('label.selected'))
                  : t('label.select-batch')}
              </Button>
            }
          />
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

const baseButtonStyles: SxProps = {
  flex: 1,
  textTransform: 'none',
  justifyContent: 'left',
  border: '1px solid lightgray',
};
