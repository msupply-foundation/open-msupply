import React, { useState } from 'react';
import {
  Alert,
  BasicSpinner,
  DialogButton,
  RadioGroup,
} from '@common/components';
import { DateUtils, useTranslation } from '@common/intl';
import { FormControlLabel, Radio, Typography } from '@mui/material';
import { useDialog } from '@common/hooks';
import {
  useStockListCount,
  useMasterListLineCount,
} from '@openmsupply-client/system';
import {
  Box,
  Formatter,
  StockLineFilterInput,
  useNavigate,
} from '@openmsupply-client/common';
import { CreateStocktakeInput } from '../api/hooks/useStocktake';
import { CreateStocktakeModalState } from './types';
import { useGenerateComment } from './generateComment';
import { StocktakeFilters } from './StocktakeFilters';

interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating?: boolean;
  description?: string;
}

const defaultFormState: CreateStocktakeModalState = {
  location: null,
  vvmStatus: null,
  masterList: null,
  expiryDate: null,
  createBlankStocktake: false,
  includeAllMasterListItems: false,
};

export const CreateStocktakeModal = ({
  open,
  onClose,
  onCreate,
  isCreating,
  description,
}: NewStocktakeModalProps) => {
  const navigate = useNavigate();
  const t = useTranslation();

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });

  const [state, setState] =
    useState<CreateStocktakeModalState>(defaultFormState);
  const {
    location,
    masterList,
    vvmStatus,
    expiryDate,
    createBlankStocktake,
    includeAllMasterListItems,
  } = state;

  const stockFilter: StockLineFilterInput = {
    location: location && {
      id: { equalTo: location.id },
    },
    masterList: masterList && {
      id: { equalTo: masterList.id },
    },
    expiryDate: expiryDate && {
      beforeOrEqualTo: Formatter.naiveDate(expiryDate),
    },
    vvmStatusId: vvmStatus && {
      equalTo: vvmStatus.id,
    },
  };

  const { data } = useStockListCount(stockFilter);
  const { data: masterListLineCount } = useMasterListLineCount(masterList?.id);

  const generateComment = useGenerateComment(state);

  const onSave = () => {
    const comment = createBlankStocktake ? '' : generateComment();

    // Our API only has a `beforeOrEqualTo` filter, so just kludging the date back 1 day here
    const adjustedExpiryDate = expiryDate
      ? DateUtils.addDays(expiryDate, -1)
      : null;

    const args: CreateStocktakeInput = {
      masterListId: masterList?.id,
      locationId: location?.id,
      vvmStatusId: vvmStatus?.id,
      createBlankStocktake,
      expiresBefore: Formatter.naiveDate(adjustedExpiryDate),
      isInitialStocktake: false,
      includeAllMasterListItems,
      description,
      comment,
    };

    onCreate(args).then(id => {
      if (id) {
        navigate(id);
      }
    });
  };

  const estimateLineCount = (): number => {
    const stockCount = data?.totalCount ?? 0;
    return includeAllMasterListItems && masterListLineCount
      ? Math.max(masterListLineCount, stockCount)
      : stockCount;
  };

  return (
    <>
      <Modal
        slideAnimation={false}
        title={t('label.new-stocktake')}
        width={650}
        height={700}
        contentProps={{ sx: { paddingY: 0 } }}
        cancelButton={
          <DialogButton
            variant="cancel"
            onClick={() => {
              setState(defaultFormState);
              onClose();
            }}
          />
        }
        okButton={
          <DialogButton
            disabled={isCreating}
            variant="ok"
            onClick={async () => {
              onSave();
              onClose();
            }}
          />
        }
      >
        <Box flex={1}>
          {!isCreating ? (
            <>
              <RadioGroup
                value={createBlankStocktake}
                sx={{ marginBottom: 3 }}
                onChange={(_, createBlankStocktake) =>
                  setState(state => ({
                    ...state,
                    createBlankStocktake: createBlankStocktake === 'true',
                  }))
                }
              >
                <FormControlLabel
                  value={true}
                  control={<Radio />}
                  label={t('stocktake.create-blank')}
                  slotProps={{ typography: { fontWeight: 'bold' } }}
                />
                <Typography variant="body2" marginLeft={4} marginBottom={1}>
                  {t('stocktake.description-blank')}
                </Typography>

                <FormControlLabel
                  value={false}
                  control={<Radio />}
                  label={t('stocktake.create-with-filters')}
                  slotProps={{ typography: { fontWeight: 'bold' } }}
                />
                <Typography variant="body2" marginLeft={4} marginBottom={2}>
                  {t('stocktake.description-filters')}
                </Typography>

                <StocktakeFilters state={state} setState={setState} />
              </RadioGroup>

              {/* Estimated lines */}
              {createBlankStocktake ? (
                <Alert severity="success" sx={{ marginRight: 0 }}>
                  {t('message.create-blank-stocktake')}
                </Alert>
              ) : (
                <Alert severity="info" sx={{ marginRight: 0 }}>
                  {t('message.lines-estimated', {
                    count: estimateLineCount(),
                  })}
                </Alert>
              )}
            </>
          ) : (
            <Box sx={{ height: '100%' }}>
              <BasicSpinner messageKey="saving" />
            </Box>
          )}
        </Box>
      </Modal>
    </>
  );
};
