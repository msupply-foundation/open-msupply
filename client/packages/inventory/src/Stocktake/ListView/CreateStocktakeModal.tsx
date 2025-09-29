import React, { useState } from 'react';
import {
  Alert,
  BasicSpinner,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  RadioGroup,
} from '@common/components';
import { DateUtils, useFormatDateTime, useTranslation } from '@common/intl';
import { FormControlLabel, Radio, Typography } from '@mui/material';
import { useDialog } from '@common/hooks';
import {
  useStockListCount,
  LocationSearchInput,
  LocationRowFragment,
  MasterListSearchInput,
  MasterListRowFragment,
  useMasterListLineCount,
  VVMStatusSearchInput,
  VvmStatusFragment,
} from '@openmsupply-client/system';
import {
  Box,
  Formatter,
  StockLineFilterInput,
  useNavigate,
  usePreferences,
} from '@openmsupply-client/common';
import { CreateStocktakeInput } from '../api/hooks/useStocktake';

const LABEL_FLEX = '0 0 150px';
interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating?: boolean;
  description?: string;
}

interface ModalState {
  masterList: MasterListRowFragment | null;
  vvmStatus: VvmStatusFragment | null;
  location: LocationRowFragment | null;
  expiryDate: Date | null;
  itemStatus: ItemStatus;
}

enum ItemStatus {
  All = 'all',
  InStock = 'in stock',
  None = 'none',
}

enum StocktakeType {
  Blank = 'blank',
  Filtered = 'filtered',
}

const defaultFormSState: ModalState = {
  location: null,
  vvmStatus: null,
  masterList: null,
  expiryDate: null,
  itemStatus: ItemStatus.InStock,
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

  const { manageVvmStatusForStock } = usePreferences();

  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });

  const [
    { location, masterList, vvmStatus, expiryDate, itemStatus },
    setState,
  ] = useState<ModalState>(defaultFormSState);

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
    hasPacksInStore: itemStatus === ItemStatus.InStock ? true : undefined,
  };

  const { data } = useStockListCount(stockFilter);
  const { data: masterListLineCount } = useMasterListLineCount(masterList?.id);

  const { localisedDate } = useFormatDateTime();

  const generateComment = () => {
    if (itemStatus === ItemStatus.None) return '';

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
      createBlankStocktake: itemStatus === ItemStatus.None,
      expiresBefore: Formatter.naiveDate(adjustedExpiryDate),
      isInitialStocktake: false,
      includeAllMasterListItems:
        itemStatus === ItemStatus.All && !!masterList?.id,
      description,
      comment: generateComment(),
    };

    onCreate(args).then(id => {
      if (id) {
        navigate(id);
      }
    });
  };

  const estimateLineCount = (): number => {
    const stockCount = data?.totalCount ?? 0;
    return itemStatus === ItemStatus.All && masterListLineCount
      ? Math.max(masterListLineCount, stockCount)
      : stockCount;
  };

  const [type, setType] = useState(StocktakeType.Filtered);

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
              setState(defaultFormSState);
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
        <Box flex={1} display="flex" justifyContent="center">
          {!isCreating ? (
            <RadioGroup
              value={type}
              onChange={(_, type) => setType(type as StocktakeType)}
            >
              <FormControlLabel
                value={StocktakeType.Blank}
                control={<Radio />}
                label={t('stocktake.create-blank')}
                slotProps={{ typography: { fontWeight: 'bold' } }}
              />
              <Typography variant="body2" marginLeft={4} marginBottom={1}>
                {t('stocktake.description-blank')}
              </Typography>

              <FormControlLabel
                value={StocktakeType.Filtered}
                control={<Radio />}
                label={t('stocktake.create-with-filters')}
                slotProps={{ typography: { fontWeight: 'bold' } }}
              />
              <Typography variant="body2" marginLeft={4} marginBottom={2}>
                {t('stocktake.description-filters')}
              </Typography>
              <Box
                sx={{
                  padding: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  backgroundColor: 'background.group.light',
                  borderRadius: '10px',
                  marginBottom: 2,
                  marginLeft: 4,
                }}
              >
                <Box>
                  <InputWithLabelRow
                    labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                    Input={
                      <MasterListSearchInput
                        disabled={type === StocktakeType.Blank}
                        onChange={masterList =>
                          setState(prev => ({
                            ...prev,
                            masterList,
                            itemStatus: ItemStatus.InStock,
                          }))
                        }
                        selectedMasterList={masterList}
                        width={380}
                        placeholder={t('label.all-items')}
                        clearable
                      />
                    }
                    label={t('label.master-list')}
                  />
                  <RadioGroup
                    value={itemStatus}
                    sx={{
                      marginLeft: '160px',
                      display: masterList ? undefined : 'none',
                      transform: 'scale(0.9)',
                    }}
                    onChange={event => {
                      setState(prev => ({
                        ...prev,
                        itemStatus: event.target.value as ItemStatus,
                      }));
                    }}
                  >
                    <FormControlLabel
                      disabled={type === StocktakeType.Blank}
                      value={ItemStatus.InStock}
                      control={<Radio sx={{ padding: '4px' }} />}
                      label={t('stocktake.items-with-soh')}
                    />
                    <FormControlLabel
                      disabled={
                        type === StocktakeType.Blank ||
                        !masterList ||
                        !!expiryDate ||
                        location ||
                        vvmStatus
                          ? true
                          : false
                      }
                      value={ItemStatus.All}
                      control={<Radio sx={{ padding: '4px' }} />}
                      label={t('stocktake.all-master-list-items')}
                    />
                  </RadioGroup>
                </Box>

                <InputWithLabelRow
                  labelProps={{
                    sx: { flex: `${LABEL_FLEX}` },
                  }}
                  Input={
                    <LocationSearchInput
                      disabled={type === StocktakeType.Blank}
                      onChange={location =>
                        setState(prev => ({ ...prev, location }))
                      }
                      width={380}
                      selectedLocation={location}
                      placeholder={t('label.all-locations')}
                      clearable
                    />
                  }
                  label={t('label.location')}
                />
                <InputWithLabelRow
                  labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                  Input={
                    <DateTimePickerInput
                      width={380}
                      disabled={type === StocktakeType.Blank}
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
                        disabled={type === StocktakeType.Blank}
                        onChange={vvmStatus =>
                          setState(prev => ({
                            ...prev,
                            vvmStatus: vvmStatus ?? null,
                          }))
                        }
                        width={380}
                        selected={vvmStatus}
                        placeholder={t('label.all-statuses')}
                        clearable
                      />
                    }
                  />
                )}
              </Box>

              {type === StocktakeType.Blank ? (
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
            </RadioGroup>
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
