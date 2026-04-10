import React, { useState } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  LoadingButton,
  usePrinter,
  PlusCircleIcon,
  useDialog,
  DialogButton,
  useNotification,
  InsertAssetLogInput,
  FnUtils,
  UserPermission,
  useAuthContext,
  AssetLogStatusNodeType,
  Box,
  SplitButton,
  SplitButtonOption,
  DetailContainer,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { UpdateStatusButton } from './UpdateStatusButton';
import { StatusForm, Draft } from './StatusForm';
import { RecordMappingModal } from './RecordMappingButton';
import { Environment } from '@openmsupply-client/config';
import { useAssetLogReasonList } from '@openmsupply-client/system';

const COLD_ROOMS_AND_FREEZER_ROOMS_CATEGORY_ID =
  '7db32eb6-5929-4dd1-a5e9-01e36baa73ad';

const getEmptyAssetLog = (assetId: string) => ({
  id: FnUtils.generateUUID(),
  assetId,
});

type ActionValue = 'update-status' | 'record-mapping';

const ColdRoomActionButton = ({
  assetId,
}: {
  assetId: string;
}) => {
  const t = useTranslation();
  const { error, success, info } = useNotification();
  const { userHasPermission } = useAuthContext();
  const [mappingOpen, setMappingOpen] = useState(false);

  // Status dialog state (same as UpdateStatusButton)
  const { insertLog, invalidateQueries } = useAssets.log.insert();
  const [draft, setDraft] = useState<Partial<Draft>>(
    getEmptyAssetLog(assetId)
  );
  const onStatusClose = () => setDraft(getEmptyAssetLog(assetId));
  const {
    Modal: StatusModal,
    hideDialog: hideStatusDialog,
    showDialog: showStatusDialog,
  } = useDialog({ onClose: onStatusClose });

  const { data: reasonsData } = useAssetLogReasonList(
    draft.status
      ? { assetLogStatus: { equalTo: draft.status } }
      : undefined
  );

  const isSubmitDisabled = () => {
    if (!draft.status) return true;
    if (
      draft.status === AssetLogStatusNodeType.NotFunctioning &&
      (draft.reasonId === undefined || draft.reasonId === '')
    )
      return true;
    const selectedReason = reasonsData?.nodes?.find(
      reason => reason.id === draft.reasonId
    );
    if (selectedReason?.commentsRequired && !draft.comment?.trim()) return true;
    return false;
  };

  const checkPermission = () =>
    userHasPermission(UserPermission.AssetMutate) ||
    userHasPermission(UserPermission.AssetStatusMutate);

  const onStatusOk = async () => {
    await insertLog(draft)
      .then(({ id }) => {
        invalidateQueries();
        if (!draft.files?.length)
          return new Promise(resolve => resolve('no files'));
        const url = `${Environment.SYNC_FILES_URL}/asset_log/${id}`;
        const formData = new FormData();
        draft.files?.forEach(file => formData.append('files', file));
        return fetch(url, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          credentials: 'include',
          body: formData,
        });
      })
      .then(() => {
        success(t('messages.log-saved-successfully'))();
        hideStatusDialog();
        onStatusClose();
      })
      .catch(e => error(`${t('error.unable-to-save-log')}: ${e.message}`)());
  };

  const onStatusChange = (patch: Partial<InsertAssetLogInput>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  };

  const options: SplitButtonOption<ActionValue>[] = [
    {
      label: t('button.update-status'),
      value: 'update-status',
      Icon: <PlusCircleIcon />,
    },
    {
      label: t('label.temperature-mapping'),
      value: 'record-mapping',
      Icon: <PlusCircleIcon />,
    },
  ];

  const [selectedOption, setSelectedOption] = useState(options[0]!);

  const triggerAction = (option: SplitButtonOption<ActionValue>) => {
    if (!checkPermission()) {
      info(t('error.no-asset-edit-status-permission'))();
      return;
    }
    if (option.value === 'update-status') {
      showStatusDialog();
    } else {
      setMappingOpen(true);
    }
  };

  return (
    <>
      <SplitButton
        color="primary"
        options={options}
        selectedOption={selectedOption}
        onSelectOption={option => {
          setSelectedOption(option);
          triggerAction(option);
        }}
        onClick={triggerAction}
        Icon={<PlusCircleIcon />}
        openFrom="bottom"
      />

      {/* Status update modal */}
      <StatusModal
        width={785}
        sx={{ '& .MuiDialogContent-root': { paddingTop: 0 } }}
        title={t('button.update-status')}
        cancelButton={
          <DialogButton
            variant="cancel"
            onClick={() => {
              onStatusClose();
              hideStatusDialog();
            }}
          />
        }
        okButton={
          <DialogButton
            variant="ok"
            onClick={onStatusOk}
            disabled={isSubmitDisabled()}
          />
        }
      >
        <DetailContainer paddingTop={1}>
          <Box
            alignItems="center"
            display="flex"
            flex={1}
            flexDirection="column"
            gap={2}
          >
            <StatusForm draft={draft} onChange={onStatusChange} />
          </Box>
        </DetailContainer>
      </StatusModal>

      {/* Record mapping modal */}
      <RecordMappingModal
        assetId={assetId}
        isOpen={mappingOpen}
        onClose={() => setMappingOpen(false)}
      />
    </>
  );
};

export const AppBarButtonsComponent = () => {
  const { data } = useAssets.document.get();
  const t = useTranslation();
  const { data: settings } = useAssets.utils.labelPrinterSettings();
  const { isPrinting, print } = usePrinter(settings);

  const isColdRoom =
    data?.assetCategory?.id === COLD_ROOMS_AND_FREEZER_ROOMS_CATEGORY_ID;

  const onClick = () => {
    const date = new Date().toLocaleDateString();
    print({
      endpoint: Environment.PRINT_LABEL_QR,
      payload: {
        code: data?.id,
        assetNumber: `${data?.assetNumber ?? ''}`,
        datePrinted: `${date}`,
      },
    });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        {isColdRoom && data?.id ? (
          <ColdRoomActionButton assetId={data.id} />
        ) : (
          <UpdateStatusButton assetId={data?.id} />
        )}
        <LoadingButton
          startIcon={<PrinterIcon />}
          isLoading={isPrinting}
          onClick={onClick}
          label={t('button.print-asset-label')}
          variant="outlined"
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
