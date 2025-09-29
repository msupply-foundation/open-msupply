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
import { CreateStocktakeModalState, StocktakeType } from './types';
import { useGenerateComment } from './useGenerateComment';
import { StocktakeFilters } from './StocktakeFilters';
import { FullStocktakeOnHandSelector } from './FullStocktakeOnHandSelector';

interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating?: boolean;
  description?: string;
}

const defaultFormState: CreateStocktakeModalState = {
  type: StocktakeType.FULL,
  location: null,
  vvmStatus: null,
  masterList: null,
  expiryDate: null,
  includeAllItems: false,
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
  const { location, masterList, vvmStatus, expiryDate, type, includeAllItems } =
    state;

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
  // no need pea?
  const { data: masterListLineCount } = useMasterListLineCount(masterList?.id);

  const generateComment = useGenerateComment(state);

  const createBlankStocktake = type === StocktakeType.BLANK;

  const onSave = () => {
    const comment = generateComment();

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
      includeAllMasterListItems: includeAllItems, // when there's a master list - otherwise this should apply to full
      // includeAllItems, // when there's a master list - otherwise this should apply to full
      description,
      comment,
    };

    onCreate(args).then(id => {
      if (id) {
        navigate(id);
      }
    });
  };

  // todo - items with no stock count? + stock lines count -- better aye
  const estimateLineCount = (): number => {
    const stockCount = data?.totalCount ?? 0;
    return includeAllItems && masterListLineCount
      ? Math.max(masterListLineCount, stockCount)
      : stockCount;
  };

  return (
    <>
      <Modal
        slideAnimation={false}
        title={t('label.new-stocktake')}
        width={650}
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
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 550,
              }}
            >
              <Box>
                <RadioGroup
                  value={type}
                  sx={{ margin: 1.5 }}
                  onChange={(_, type) =>
                    setState({
                      // reset the other inputs when changing stocktake type
                      ...defaultFormState,
                      type: type as StocktakeType,
                    })
                  }
                >
                  <FormControlLabel
                    value={StocktakeType.FULL}
                    control={<Radio sx={{ paddingY: '7px' }} />}
                    label={t('stocktake.create-full')}
                    slotProps={{ typography: { fontWeight: 'bold' } }}
                  />

                  <FormControlLabel
                    value={StocktakeType.FILTERED}
                    control={<Radio sx={{ paddingY: '7px' }} />}
                    label={t('stocktake.create-with-filters')}
                    slotProps={{ typography: { fontWeight: 'bold' } }}
                  />

                  <FormControlLabel
                    value={StocktakeType.BLANK}
                    control={<Radio sx={{ paddingY: '7px' }} />}
                    label={t('stocktake.create-blank')}
                    slotProps={{ typography: { fontWeight: 'bold' } }}
                  />
                </RadioGroup>

                <Box
                  sx={{
                    backgroundColor: 'background.group.light',
                    padding: 2,
                    borderRadius: '10px',
                  }}
                >
                  {type === StocktakeType.FULL && (
                    <>
                      <Typography variant="body2">
                        {t('stocktake.description-full')}
                      </Typography>
                      <FullStocktakeOnHandSelector
                        includeAllItems={includeAllItems}
                        setState={setState}
                      />
                    </>
                  )}
                  {type === StocktakeType.FILTERED && (
                    <>
                      <Typography variant="body2">
                        {t('stocktake.description-filters')}
                      </Typography>
                      <StocktakeFilters state={state} setState={setState} />
                    </>
                  )}
                  {type === StocktakeType.BLANK && (
                    <Typography variant="body2">
                      {t('stocktake.description-blank')}
                    </Typography>
                  )}
                </Box>
              </Box>

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
            </Box>
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
