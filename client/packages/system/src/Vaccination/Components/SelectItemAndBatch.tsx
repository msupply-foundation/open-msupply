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
import React, { PropsWithChildren, useMemo } from 'react';
import { VaccinationDraft } from '../api';
import { VaccinationCourseDoseFragment } from '../api/operations.generated';
import { OTHER_FACILITY } from './FacilitySearchInput';

export const SelectItemAndBatch = ({
  draft,
  dose,
  updateDraft,
  openBatchModal,
}: {
  dose: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
  openBatchModal: () => void;
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

  return (
    <>
      {draft.historical && (
        <Box>
          <Checkbox
            id="recordBatch"
            checked={draft.recordBatch}
            onChange={() =>
              updateDraft({
                recordBatch: !draft.recordBatch,
              })
            }
          />
          <Typography component="label" htmlFor="recordBatch">
            {t('label.record-stock-transaction')}
          </Typography>
        </Box>
      )}
      {draft.recordBatch && (
        <>
          <InputWithLabelRow
            label={t('label.vaccine-item')}
            Input={
              <Select
                options={vaccineItemOptions}
                value={draft.itemId ?? ''}
                onChange={e => updateDraft({ itemId: e.target.value })}
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
