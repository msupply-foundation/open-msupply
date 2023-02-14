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
import { useMasterList } from '@openmsupply-client/system';
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
  const isLoading = isLoadingMasterLists;
  const handleMasterListChange: ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = event => {
    setCreateStocktakeArgs({
      ...createStocktakeArgs,
      masterListId: event.target.value?.toString(),
    });
  };
  const masterLists = [
    { label: t('label.please-select'), value: 'undefined' },
    ...(masterListData
      ? masterListData.nodes.map(list => ({
          label: list.name,
          value: list.id,
        }))
      : []),
  ];

  useEffect(() => {
    fetchMasterLists();
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
                  You can create a stocktake based on items currently assigned
                  to a location, items assigned to a master list or a
                  combination of both.
                </Typography>
                <Typography padding={1} paddingBottom={4}>
                  To create an empty stocktake, simply click <b>OK</b> to
                  continue
                </Typography>
                <InputWithLabelRow
                  Input={
                    <Select
                      fullWidth
                      onChange={handleMasterListChange}
                      options={masterLists}
                      value={createStocktakeArgs.masterListId}
                      // renderOption={renderOption}
                    />
                  }
                  label={t('label.master-list')}
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
