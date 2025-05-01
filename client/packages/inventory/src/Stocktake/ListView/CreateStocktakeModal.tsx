import React, { FC, useState } from 'react';
import {
  BasicSpinner,
  Checkbox,
  DateTimePickerInput,
  DialogButton,
  InputWithLabelRow,
  Select,
  Typography,
} from '@common/components';
import { useTranslation } from '@common/intl';
import { useDialog } from '@common/hooks';
import {
  useStockList,
  useLocationList,
  useMasterLists,
} from '@openmsupply-client/system';
import { Box, useAuthContext } from '@openmsupply-client/common';
import { useCreateStocktake } from './createStocktake';

const LABEL_FLEX = '0 0 150px';

interface CreateStocktakeArgs {
  masterListId?: string;
  locationId?: string;
  itemsHaveStock?: boolean;
  expiresBefore?: Date | null;
  isInitialStocktake: boolean;
  comment: string | undefined;
}

const DEFAULT_ARGS: CreateStocktakeArgs = {
  masterListId: '',
  locationId: '',
  itemsHaveStock: false,
  expiresBefore: null,
  isInitialStocktake: false,
  comment: undefined,
};

interface NewStocktakeModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateStocktakeModal: FC<NewStocktakeModalProps> = ({
  open,
  onClose,
}) => {
  const t = useTranslation();
  const [createStocktakeArgs, setCreateStocktakeArgs] =
    useState<CreateStocktakeArgs>(DEFAULT_ARGS);
  const { isLoading: isSaving, createStocktake } = useCreateStocktake();
  const { store } = useAuthContext();
  const { data: masterListData, isLoading: isLoadingMasterLists } =
    useMasterLists({
      queryParams: {
        filterBy: {
          existsForStoreId: { equalTo: store?.id },
        },
      },
    });
  const {
    query: { data: locationData, isLoading: isLoadingLocations },
  } = useLocationList({ sortBy: { key: 'name', direction: 'asc' } });
  const { data: stockData, isLoading: isLoadingStock } = useStockList({
    sortBy: {
      key: 'expiryDate',
      direction: 'asc',
    },
  });

  const { Modal } = useDialog({ isOpen: open, onClose, disableBackdrop: true });

  const generateComment = () => {
    const { locationId, masterListId, itemsHaveStock } = createStocktakeArgs;
    if (masterListId) {
      const masterList = masterListData?.nodes?.find(
        list => list.id === masterListId
      );
      if (masterList)
        return t('stocktake.comment-list-template', { list: masterList.name });
    }

    if (locationId) {
      const location = locations.find(
        location => location.value === locationId
      );
      if (location)
        return t('stocktake.comment-location-template', {
          location: location.label,
        });
    }

    if (itemsHaveStock) {
      return t('stocktake-comment-items-have-stock-template');
    }
  };

  const onSave = () => {
    const { locationId, masterListId, itemsHaveStock, expiresBefore } =
      createStocktakeArgs;
    const args: CreateStocktakeArgs = {
      masterListId: masterListId ? masterListId : undefined,
      locationId: locationId ? locationId : undefined,
      itemsHaveStock: itemsHaveStock ? itemsHaveStock : undefined,
      expiresBefore: expiresBefore ? expiresBefore : undefined,
      // max of one of the above args should be defined per stocktake
      isInitialStocktake: false,
      comment: generateComment(),
    };
    createStocktake(args);
  };

  const masterLists =
    masterListData?.nodes?.map(list => ({
      label: `${list.name} (${list?.linesCount} ${t('label.item', {
        count: list.linesCount ?? undefined,
      })})`,
      value: list.id,
    })) || [];

  const locations =
    locationData?.nodes.map(location => ({
      label: location.code,
      value: location.id,
    })) || [];

  const isLoading =
    isLoadingMasterLists || isLoadingLocations || isLoadingStock;

  return (
    <>
      <Modal
        slideAnimation={false}
        title={t('label.new-stocktake')}
        cancelButton={
          <DialogButton
            disabled={isLoading}
            variant="cancel"
            onClick={onClose}
          />
        }
        okButton={
          <DialogButton
            disabled={isSaving}
            variant="ok"
            onClick={async () => {
              await onSave();
              onClose();
            }}
          />
        }
      >
        <Box flex={1} display="flex" justifyContent="center">
          {!isSaving ? (
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
                  masterLists.length === 0 ? (
                    <Typography sx={{ color: 'gray.main' }}>
                      {t('messages.no-master-lists')}
                    </Typography>
                  ) : (
                    <Select
                      fullWidth
                      onChange={event =>
                        setCreateStocktakeArgs({
                          ...DEFAULT_ARGS,
                          masterListId: event.target.value?.toString(),
                        })
                      }
                      options={masterLists}
                      value={createStocktakeArgs.masterListId}
                    />
                  )
                }
                label={t('label.master-list')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  locations.length === 0 ? (
                    <Typography sx={{ color: 'gray.main' }}>
                      {t('messages.no-locations')}
                    </Typography>
                  ) : (
                    <Select
                      fullWidth
                      onChange={event =>
                        setCreateStocktakeArgs({
                          ...DEFAULT_ARGS,
                          locationId: event.target.value?.toString(),
                        })
                      }
                      options={locations}
                      value={createStocktakeArgs.locationId}
                    />
                  )
                }
                label={t('label.location')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  !stockData ? (
                    <Typography sx={{ color: 'gray.main' }}>
                      {t('messages.no-items-with-stock')}
                    </Typography>
                  ) : (
                    <Checkbox
                      style={{ paddingLeft: 0 }}
                      checked={createStocktakeArgs.itemsHaveStock}
                      onChange={event => {
                        setCreateStocktakeArgs({
                          ...DEFAULT_ARGS,
                          itemsHaveStock: event.target.checked,
                        });
                      }}
                    />
                  )
                }
                label={t('label.items-with-stock')}
              />
              <InputWithLabelRow
                labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
                Input={
                  <DateTimePickerInput
                    value={createStocktakeArgs.expiresBefore}
                    onChange={event => {
                      setCreateStocktakeArgs({
                        ...DEFAULT_ARGS,
                        expiresBefore: event,
                      });
                    }}
                  />
                }
                label={t('label.items-expiring-before')}
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
