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
  LoadingButton,
  ToggleState,
  useNavigate,
  RouteBuilder,
  useSimplifiedTabletUI,
  useExportCSV,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { requestsToCsv } from '../../utils';
import { CreateRequisitionModal } from './CreateRequisitionModal';
import { AppRoute } from '@openmsupply-client/config';
import { NewRequisitionType } from '../../types';

export const AppBarButtons: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: onCreate } = useRequest.document.insert();
  const { insert: onProgramCreate } = useRequest.document.insertProgram();
  const { error } = useNotification();

  const exportCSV = useExportCSV();
  const { isLoading, fetchAsync } = useRequest.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });
  const simplifiedTabletView = useSimplifiedTabletUI();

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = requestsToCsv(data.nodes, t);
    exportCSV(csv, t('filename.requests'));
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-internal-order')}
          onClick={modalController.toggleOn}
        />
        {!simplifiedTabletView && (
          <LoadingButton
            startIcon={<DownloadIcon />}
            variant="outlined"
            isLoading={isLoading}
            onClick={csvExport}
            label={t('button.export')}
          />
        )}
      </Grid>
      <CreateRequisitionModal
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
        onCreate={async newRequisition => {
          switch (newRequisition.type) {
            case NewRequisitionType.General:
              return onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId: newRequisition.name.id,
              }).then(({ id }) => {
                modalController.toggleOff();
                navigate(
                  RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InternalOrder)
                    .addPart(id)
                    .build()
                );
              });
            case NewRequisitionType.Program:
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { type: _, ...rest } = newRequisition;
              return onProgramCreate({
                id: FnUtils.generateUUID(),
                ...rest,
              }).then(response => {
                if (response.__typename == 'RequisitionNode') {
                  modalController.toggleOff();
                  navigate(
                    RouteBuilder.create(AppRoute.Replenishment)
                      .addPart(AppRoute.InternalOrder)
                      .addPart(String(response.id))
                      .build()
                  );
                }
              });
          }
        }}
      />
    </AppBarButtonsPortal>
  );
};
