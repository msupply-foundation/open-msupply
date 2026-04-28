import React, { useState } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PrinterIcon,
  LoadingButton,
  usePrinter,
  PlusCircleIcon,
  useNotification,
  UserPermission,
  useAuthContext,
  SplitButton,
  SplitButtonOption,
} from '@openmsupply-client/common';
import { useAssets } from '../api';
import { UpdateStatusButton } from './UpdateStatusButton';
import { RecordMappingModal } from './RecordMappingButton';
import { Environment } from '@openmsupply-client/config';
import { useStatusLogDialog } from './useStatusLogDialog';
import { useIsColdRoom } from '../utils';

type ActionValue = 'update-status' | 'record-mapping';

const ColdRoomActionButton = ({
  assetId,
}: {
  assetId: string;
}) => {
  const t = useTranslation();
  const { info } = useNotification();
  const { userHasPermission } = useAuthContext();
  const [mappingOpen, setMappingOpen] = useState(false);
  const { StatusModal, showDialog } = useStatusLogDialog(assetId);

  const checkPermission = () =>
    userHasPermission(UserPermission.AssetMutate) ||
    userHasPermission(UserPermission.AssetStatusMutate);

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
      showDialog();
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

      {StatusModal}

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

  const isColdRoom = useIsColdRoom();

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
