import React, { useState } from 'react';
import {
  BasicSpinner,
  Checkbox,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  Typography,
} from '@common/components';
import { useFormatDateTime, useTranslation } from '@common/intl';
import { useDialog } from '@common/hooks';
import {
  useStockList,
  LocationSearchInput,
  LocationRowFragment,
  MasterListSearchInput,
  MasterListRowFragment,
} from '@openmsupply-client/system';
import {
  Box,
  Formatter,
  StockLineFilterInput,
} from '@openmsupply-client/common';
import {
  CreateStocktakeInput,
  defaultCreateStocktakeInput,
} from '../api/hooks/useStocktake';

const LABEL_FLEX = '0 0 150px';
interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating?: boolean;
  navigate: (id: string) => void;
  description?: string;
}

// Intended behaviour is for the stocktake to generate based on multiple argument selections together with a logical AND.

export const CreateStocktakeModal = ({
  open,
  onClose,
  onCreate,
  isCreating,
  navigate,
  description,
}: NewStocktakeModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({
    isOpen: open,
    onClose,
    disableBackdrop: true,
  });

  const [stockFilter, setStockFilter] = useState<StockLineFilterInput>();
  const { data, isLoading: stockIsLoading } = useStockList({
    filterBy: stockFilter,
  });

  const [createStocktakeArgs, setCreateStocktakeArgs] =
    useState<CreateStocktakeInput>(defaultCreateStocktakeInput);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationRowFragment | null>(null);
  const [selectedMasterList, setSelectedMasterList] =
    useState<MasterListRowFragment | null>(null);

  const { localisedDate } = useFormatDateTime();

  const handleLocationChange = (location: LocationRowFragment | null) => {
    setSelectedLocation(location);
    setCreateStocktakeArgs(prev => ({
      ...prev,
      locationId: location?.id ?? '',
    }));
    setStockFilter(prev => ({
      ...prev,
      location: location
        ? {
            id: { equalTo: location.id },
          }
        : null,
    }));
  };

  const handleMasterListChange = (masterList: MasterListRowFragment | null) => {
    setSelectedMasterList(masterList);
    setCreateStocktakeArgs(prev => ({
      ...prev,
      masterListId: masterList?.id,
    }));
    setStockFilter(prev => ({
      ...prev,
      masterList: masterList?.id
        ? {
            id: { equalTo: masterList?.id },
          }
        : null,
    }));
  };

  const handleCreateBlankChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCreateStocktakeArgs(prev => ({
      ...prev,
      createBlankStocktake: event.target.checked || null,
    }));
    setStockFilter(prev => ({
      ...prev,
      hasPacksInStore: event.target.checked || null,
    }));
  };

  const handleExpiresBeforeChange = (date: Date | null) => {
    const nextDate = Formatter.naiveDate(date);
    setCreateStocktakeArgs(prev => ({
      ...prev,
      expiresBefore: nextDate,
    }));
    setStockFilter(prev => ({
      ...prev,
      expiryDate: nextDate ? { beforeOrEqualTo: nextDate } : null,
    }));
  };

  const generateComment = () => {
    const { createBlankStocktake, expiresBefore } = createStocktakeArgs;
    if (createBlankStocktake) return '';

    const filterComments: string[] = [];

    if (!!selectedMasterList) {
      filterComments.push(
        t('stocktake.master-list-template', {
          masterList: selectedMasterList.name,
        })
      );
    }
    if (!!selectedLocation) {
      filterComments.push(
        t('stocktake.location-template', {
          location: selectedLocation.code,
        })
      );
    }

    if (expiresBefore) {
      filterComments.push(
        t('stocktake.expires-before-template', {
          date: localisedDate(expiresBefore),
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
    const { locationId, masterListId, createBlankStocktake, expiresBefore } =
      createStocktakeArgs;

    console.log(createStocktakeArgs);

    const args: CreateStocktakeInput = {
      masterListId,
      locationId,
      createBlankStocktake,
      expiresBefore,
      isInitialStocktake: false,
      description,
      comment: generateComment(),
    };
    onCreate(args).then(id => {
      if (id) {
        navigate(id);
      }
    });
  };

  return (
    <>
      <Modal
        slideAnimation={false}
        title={t('label.new-stocktake')}
        width={650}
        cancelButton={
          <DialogButton
            disabled={stockIsLoading}
            variant="cancel"
            onClick={onClose}
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
            <Box paddingLeft={2} display="flex" flexDirection="column" gap={2}>
              <Typography padding={1}>
                {t('messages.create-stocktake-1')}
              </Typography>
              <Typography padding={1}>
                {t('messages.create-stocktake-2')}
              </Typography>
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <Checkbox
                    style={{ paddingLeft: 0 }}
                    checked={!!createStocktakeArgs.createBlankStocktake}
                    onChange={handleCreateBlankChange}
                  />
                }
                label={t('stocktake.create-blank')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <MasterListSearchInput
                    disabled={!!createStocktakeArgs.createBlankStocktake}
                    onChange={handleMasterListChange}
                    selectedMasterList={
                      createStocktakeArgs.masterListId
                        ? selectedMasterList
                        : null
                    }
                    width={380}
                  />
                }
                label={t('label.master-list')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <LocationSearchInput
                    disabled={!!createStocktakeArgs.createBlankStocktake}
                    onChange={handleLocationChange}
                    width={380}
                    selectedLocation={
                      createStocktakeArgs.locationId ? selectedLocation : null
                    }
                  />
                }
                label={t('label.location')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <DateTimePickerInput
                    disabled={!!createStocktakeArgs.createBlankStocktake}
                    value={
                      createStocktakeArgs.expiresBefore
                        ? new Date(createStocktakeArgs.expiresBefore)
                        : null
                    }
                    onChange={handleExpiresBeforeChange}
                  />
                }
                label={t('label.items-expiring-before')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={`${data?.totalCount}`}
                label={t('label.stock-lines-found')}
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
