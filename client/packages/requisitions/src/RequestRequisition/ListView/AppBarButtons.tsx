import React, { FC } from 'react';
import {
  FnUtils,
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FileUtils,
  LoadingButton,
  ToggleState,
  Platform,
  EnvUtils,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { requestsToCsv } from '../../utils';
import { CreateRequisitionModal } from './CreateRequisitionModal';
import { NewRequisitionType } from './types';
import { AppRoute } from '@openmsupply-client/config';

export const AppBarButtons: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: onCreate } = useRequest.document.insert();
  const { mutateAsync: onProgramCreate } = useRequest.document.insertProgram();
  const { success, error } = useNotification();
  const { isLoading, fetchAsync } = useRequest.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = requestsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.requests'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-requisition')}
          onClick={modalController.toggleOn}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={isLoading}
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
      <CreateRequisitionModal
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
        onCreate={async newRequisition => {
          modalController.toggleOff();
          switch (newRequisition.type) {
            case NewRequisitionType.General:
              return onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId: newRequisition.name.id,
              }).then(requisitionNumber => {
                navigate(
                  RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InternalOrder)
                    .addPart(String(requisitionNumber))
                    .build(),
                  { replace: true }
                );
              });
            case NewRequisitionType.Program:
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { type: _, ...rest } = newRequisition;
              return onProgramCreate({
                id: FnUtils.generateUUID(),
                ...rest,
              }).then(requisitionNumber => {
                navigate(
                  RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InternalOrder)
                    .addPart(String(requisitionNumber))
                    .build(),
                  { replace: true }
                );
              });
          }
        }}
      />
    </AppBarButtonsPortal>
  );
};
