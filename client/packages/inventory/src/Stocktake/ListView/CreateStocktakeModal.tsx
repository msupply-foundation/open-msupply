import React, { useState } from 'react';
import {
  BasicSpinner,
  Checkbox,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  RadioGroup,
} from '@common/components';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import { FormControlLabel, Radio, Stack, Typography } from '@mui/material';
import { useDialog } from '@common/hooks';
import {
  useStockListCount,
  LocationSearchInput,
  LocationRowFragment,
  MasterListSearchInput,
  MasterListRowFragment,
  useMasterListLineCount,
  VVMStatusSearchInput,
} from '@openmsupply-client/system';
import {
  Box,
  Formatter,
  StockLineFilterInput,
  useNavigate,
  usePreferences,
} from '@openmsupply-client/common';
import { CreateStocktakeInput } from '../api/hooks/useStocktake';
import { VvmStatusFragment } from 'packages/system/src/Stock/api';
import { NONAME } from 'dns';

const LABEL_FLEX = '0 0 150px';
interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating?: boolean;
  description?: string;
}

interface ModalState {
  location: LocationRowFragment | null;
  masterList: MasterListRowFragment | null;
  expiryDate: Date | null;
  createBlankStocktake: boolean;
  includeAllMasterListItems: boolean;
  vvmStatus: VvmStatusFragment | null;
}

export const CreateStocktakeModal = ({
  open,
  onClose,
  onCreate,
  isCreating,
  description,
}: NewStocktakeModalProps) => {
  const navigate = useNavigate();
  const t = useTranslation();

  const { manageVvmStatusForStock } = usePreferences();

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });

  const [
    {
      location,
      masterList,
      vvmStatus,
      expiryDate,
      createBlankStocktake,
      includeAllMasterListItems,
    },
    setState,
  ] = useState<ModalState>({
    location: null,
    vvmStatus: null,
    masterList: null,
    expiryDate: null,
    createBlankStocktake: false,
    includeAllMasterListItems: false,
  });

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

  const { localisedDate } = useFormatDateTime();

  const generateComment = () => {
    if (createBlankStocktake) return '';

    const filterComments: string[] = [];

    if (!!masterList) {
      filterComments.push(
        t('stocktake.master-list-template', {
          masterList: masterList.name,
        })
      );
    }
    if (!!location) {
      filterComments.push(
        t('stocktake.location-template', {
          location: location.code,
        })
      );
    }
    if (!!expiryDate) {
      filterComments.push(
        t('stocktake.expires-before-template', {
          date: localisedDate(expiryDate),
        })
      );
    }
    if (!!vvmStatus) {
      filterComments.push(
        t('stocktake.vvm-status-template', {
          vvmStatus: vvmStatus.description,
        })
      );
    }

    if (filterComments.length === 0) return undefined;
    if (filterComments.length === 1)
      return t('stocktake.comment-template', { filters: filterComments[0] });

    const comments = t('stocktake.comment-and-template', {
      start: filterComments.slice(0, -1).join(', '),
      end: filterComments[filterComments.length - 1],
    });

    return t('stocktake.comment-template', { filters: comments });
  };

  const onSave = () => {
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
      comment: generateComment(),
    };
    onCreate(args).then(id => {
      if (id) {
        navigate(id);
      }
    });
  };

  let estimatedLineCount = 0;
  if (createBlankStocktake) {
    estimatedLineCount = 0;
  } else {
    const stockCount = data?.totalCount ?? 0;
    estimatedLineCount =
      includeAllMasterListItems && masterListLineCount
        ? Math.max(masterListLineCount, stockCount)
        : stockCount;
  }

  const handleRadioButton: React.ChangeEventHandler<HTMLInputElement> = (
    event
  ): void => {
    if (event.target.value === 'none') {
      setState(() => ({
        createBlankStocktake: e.target.checked,
        masterList: null,
        includeAllMasterListItems: false,
        location: null,
        expiryDate: null,
        vvmStatus: null,
      }));
    }
  };

  return (
    <>
      <Modal
        slideAnimation={false}
        title={t('label.new-stocktake')}
        width={650}
        cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
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
        <Box flex={1} display="flex" justifyContent="center">
          {!isCreating ? (
            <Box paddingLeft={2} display="flex" flexDirection="column" gap={2}>
              {/* Input boxes */}

              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <MasterListSearchInput
                    disabled={!!createBlankStocktake}
                    onChange={masterList =>
                      setState(prev => ({ ...prev, masterList }))
                    }
                    selectedMasterList={masterList}
                    width={380}
                  />
                }
                label={t('label.master-list')}
              />

              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <LocationSearchInput
                    disabled={
                      !!createBlankStocktake || includeAllMasterListItems
                    }
                    onChange={location =>
                      setState(prev => ({ ...prev, location }))
                    }
                    width={380}
                    selectedLocation={location}
                  />
                }
                label={t('label.location')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <DateTimePickerInput
                    width="100%"
                    disabled={
                      !!createBlankStocktake || includeAllMasterListItems
                    }
                    value={expiryDate}
                    onChange={expiryDate =>
                      setState(prev => ({ ...prev, expiryDate }))
                    }
                  />
                }
                label={t('label.items-expiring-before')}
              />
              {manageVvmStatusForStock && (
                <InputWithLabelRow
                  label={t('label.vvm-status')}
                  labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                  Input={
                    <VVMStatusSearchInput
                      disabled={
                        !!createBlankStocktake || includeAllMasterListItems
                      }
                      onChange={vvmStatus =>
                        setState(prev => ({
                          ...prev,
                          vvmStatus: vvmStatus ?? null,
                        }))
                      }
                      width={380}
                      selected={vvmStatus}
                    />
                  }
                />
              )}

              {/* item status radio buttons, default all (number of lines) */}
              <Stack
                flexDirection="row"
                alignItems="center"
                sx={{
                  padding: 2,
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    paddingRight: '87px',
                  }}
                >
                  <Typography alignSelf="center" fontWeight="bold">
                    {t('label.store')}:
                  </Typography>
                </Box>

                <Box>
                  <RadioGroup
                    sx={{ margin: '0 auto' }}
                    defaultValue="All"
                    // value={draft.given ?? null}
                    onChange={event => console.log(event.target.value)}
                  >
                    <FormControlLabel
                      // disabled={givenAtOtherStore}
                      value="All"
                      control={<Radio />}
                      label={t('label.all')}
                    />
                    <FormControlLabel
                      // disabled={givenAtOtherStore}
                      value="In stock"
                      control={<Radio />}
                      label={t('report.in-stock')}
                    />
                    <FormControlLabel
                      // disabled={givenAtOtherStore}
                      value="None"
                      control={<Radio />}
                      label={t('label.none')}
                    />
                  </RadioGroup>
                </Box>
              </Stack>

              {/* Estimated number of rows information pill / if None selected will create a blank stocktake info pill*/}
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={estimatedLineCount}
                label={t('label.stocktake-estimated-lines')}
              />
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
