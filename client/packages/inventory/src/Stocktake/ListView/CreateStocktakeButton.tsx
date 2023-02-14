import React, { ChangeEventHandler, useEffect, useState } from 'react';
import {
  BasicSpinner,
  ButtonWithIcon,
  DialogButton,
  InputWithLabelRow,
  Select,
  Typography,
} from '@common/components';
import { PlusCircleIcon } from '@common/icons';
import { useFormatDateTime, useTranslation } from '@common/intl';
import { ToggleState, useDialog } from '@common/hooks';
import { useStocktake } from '../api';
import { useMasterList, useLocation } from '@openmsupply-client/system';
import {
  Box,
  FnUtils,
  InsertStocktakeInput,
  useAuthContext,
} from '@openmsupply-client/common';

interface CreateStocktakeArgs {
  masterListId?: string;
  locationId?: string;
}

const DEFAULT_ARGS: CreateStocktakeArgs = {
  masterListId: 'undefined',
  locationId: 'undefined',
};

export const CreateStocktakeButton: React.FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('inventory');
  const { mutateAsync, isLoading: isSaving } = useStocktake.document.insert();
  const {
    data: masterListData,
    isLoading: isLoadingMasterLists,
    mutate: fetchMasterLists,
  } = useMasterList.document.listAll({ key: 'name', direction: 'asc' });
  const {
    data: locationData,
    isLoading: isLoadingLocations,
    mutate: fetchLocations,
  } = useLocation.document.listAll({ key: 'name', direction: 'asc' });
  const { user } = useAuthContext();
  const { localisedDate } = useFormatDateTime();
  const [createStocktakeArgs, setCreateStocktakeArgs] =
    useState<CreateStocktakeArgs>(DEFAULT_ARGS);

  const onChange = async () => {
    const description = t('stocktake.description-template', {
      username: user ? user.name : 'unknown user',
      date: localisedDate(new Date()),
    });
    const input: InsertStocktakeInput = {
      id: FnUtils.generateUUID(),
      description,
      masterListId:
        createStocktakeArgs.masterListId === 'undefined'
          ? undefined
          : createStocktakeArgs.masterListId,
      locationId:
        createStocktakeArgs.locationId === 'undefined'
          ? undefined
          : createStocktakeArgs.locationId,
    };
    await mutateAsync(input);
  };

  const onClose = () => {
    modalController.toggleOff();
    setCreateStocktakeArgs(DEFAULT_ARGS);
  };
  const { Modal } = useDialog({
    isOpen: modalController.isOn,
    onClose,
    disableBackdrop: true,
  });
  const isLoading = isLoadingMasterLists || isLoadingLocations;
  const handleMasterListChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = event => {
    setCreateStocktakeArgs({
      locationId: 'undefined',
      masterListId: event.target.value?.toString(),
    });
  };
  const handleLocationChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = event => {
    setCreateStocktakeArgs({
      locationId: event.target.value?.toString(),
      masterListId: 'undefined',
    });
  };
  const masterLists = [
    { label: t('label.please-select'), value: 'undefined' },
    ...(masterListData
      ? masterListData.nodes.map(list => ({
          label: `${list.name} (${list.lines.totalCount} ${t('label.item', {
            count: list.lines.totalCount,
          })})`,
          value: list.id,
        }))
      : []),
  ];
  const locations = [
    { label: t('label.please-select'), value: 'undefined' },
    ...(locationData
      ? locationData.nodes.map(location => ({
          label: location.name,
          value: location.id,
        }))
      : []),
  ];

  useEffect(() => {
    fetchMasterLists();
    fetchLocations();
  }, []);

  return (
    <>
      {modalController.isOn && (
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
                await onChange();
                onClose();
              }}
            />
          }
        >
          <Box flex={1} display="flex" justifyContent="center">
            {!isSaving ? (
              <Box paddingLeft={2}>
                <Typography padding={1}>
                  {t('messages.create-stocktake-1')}
                </Typography>
                <Typography padding={1} paddingBottom={4}>
                  {t('messages.create-stocktake-2')}
                </Typography>
                <InputWithLabelRow
                  Input={
                    <Select
                      fullWidth
                      onChange={handleMasterListChange}
                      options={masterLists}
                      value={createStocktakeArgs.masterListId}
                    />
                  }
                  label={t('label.master-list')}
                />
                <Box sx={{ height: 16 }} />
                <InputWithLabelRow
                  Input={
                    <Select
                      fullWidth
                      onChange={handleLocationChange}
                      options={locations}
                      value={createStocktakeArgs.locationId}
                    />
                  }
                  label={t('label.location')}
                />
              </Box>
            ) : (
              <Box sx={{ height: '100%' }}>
                <BasicSpinner messageKey="saving" />
              </Box>
            )}
          </Box>
        </Modal>
      )}
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        label={t('label.new-stocktake')}
        onClick={modalController.toggleOn}
      />
    </>
  );
};
