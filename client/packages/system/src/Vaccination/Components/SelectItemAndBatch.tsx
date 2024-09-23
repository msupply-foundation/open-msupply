import {
  Box,
  Button,
  Checkbox,
  InputWithLabelRow,
  Select,
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
  editingExisting,
  updateDraft,
  openBatchModal,
}: {
  dose: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  editingExisting: boolean;
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

  const selectBatch = !isHistorical || recordHistoricalBatch || editingExisting;

  // You can edit the batch immediately, but not once its a historical vaccination
  const disableBatchEdit = editingExisting && isHistorical;

  return (
    <>
      {isHistorical && (
        <Box>
          <Checkbox
            id="recordBatch"
            checked={recordHistoricalBatch}
            onChange={() => setRecordBatch(!recordHistoricalBatch)}
          />
          <Typography component="label" htmlFor="recordBatch">
            {t('label.record-stock-transaction')}
          </Typography>
        </Box>
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
                disabled={disableBatchEdit}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.batch')}
            Input={
              <Button
                disabled={!draft.itemId || disableBatchEdit}
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
