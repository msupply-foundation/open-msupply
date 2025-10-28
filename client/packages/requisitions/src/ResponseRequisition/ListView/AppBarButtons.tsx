import React, { useState } from 'react';
import {
  DownloadIcon,
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  LoadingButton,
  ToggleState,
  FnUtils,
  RouteBuilder,
  ButtonWithIcon,
  PlusCircleIcon,
  useNavigate,
  useExportCSV,
  usePreferences,
} from '@openmsupply-client/common';
import { NameRowFragment } from '@openmsupply-client/system';
import { ResponseRowFragment, useResponse } from '../api';
import { responsesToCsv } from '../../utils';
import { AppRoute } from '@openmsupply-client/config';
import { NewRequisitionType } from '../../types';
import {
  CreateRequisitionModal,
  NewGeneralRequisition,
} from './CreateRequisitionModal';
import { CreateOrderModal } from './CreateOrderModal';
import { NewProgramRequisition } from './ProgramRequisitionOptions';

export const AppBarButtons = ({
  requisitionModalController,
  createOrderModalController,
}: {
  requisitionModalController: ToggleState;
  createOrderModalController: ToggleState;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { error } = useNotification();
  const exportCSV = useExportCSV();
  const { canCreateInternalOrderFromARequisition = false } = usePreferences();
  const [selectedSupplier, setSelectedSupplier] = useState<
    NameRowFragment | undefined
  >(undefined);

  const { mutateAsync: onCreate } = useResponse.document.insert();
  const { insert: onProgramCreate } = useResponse.document.insertProgram();
  const { mutateAsync, isLoading } = useResponse.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });
  const { mutateAsync: createOrder } =
    useResponse.document.insertRequestFromResponse();

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }
    const csv = responsesToCsv(data.nodes, t);
    exportCSV(csv, 'requisitions');
  };

  const handleCreateRequisition = async (
    newRequisition: NewGeneralRequisition | NewProgramRequisition
  ) => {
    const id = FnUtils.generateUUID();
    let requisitionId: string | undefined;

    switch (newRequisition.type) {
      case NewRequisitionType.General:
        requisitionId = await onCreate({
          id,
          otherPartyId: newRequisition.name.id,
        });
        break;
      case NewRequisitionType.Program:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { type, ...programData } = newRequisition;
        const response = await onProgramCreate({
          id,
          ...programData,
        });

        if (response.__typename === 'RequisitionNode') {
          requisitionId = response.id;
        }
        break;
    }

    if (requisitionId) {
      requisitionModalController.toggleOff();
      navigate(
        RouteBuilder.create(AppRoute.Distribution)
          .addPart(AppRoute.CustomerRequisition)
          .addPart(requisitionId)
          .build()
      );
    }
  };

  const handleCreateOrderFromRequisition = async (
    requisition: ResponseRowFragment
  ) => {
    try {
      const orderId = await createOrder({
        id: FnUtils.generateUUID(),
        responseRequisitionId: requisition.id,
        otherPartyId: selectedSupplier?.id || '',
        maxMonthsOfStock: requisition.maxMonthsOfStock,
        minMonthsOfStock: requisition.minMonthsOfStock,
      });

      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.InternalOrder)
          .addPart(orderId)
          .build()
      );
    } catch (err) {
      console.error('Error creating order:', err);
      error(t('error.failed-to-create-internal-order'))();
    } finally {
      setSelectedSupplier(undefined);
      createOrderModalController.toggleOff();
    }
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-requisition')}
          onClick={requisitionModalController.toggleOn}
        />
        {canCreateInternalOrderFromARequisition && (
          <ButtonWithIcon
            Icon={<PlusCircleIcon />}
            label={t('button.create-order')}
            onClick={() => {
              setSelectedSupplier(undefined);
              createOrderModalController.toggleOn();
            }}
          />
        )}
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          onClick={csvExport}
          variant="outlined"
          label={t('button.export')}
        />
      </Grid>
      <CreateRequisitionModal
        isOpen={requisitionModalController.isOn}
        onClose={requisitionModalController.toggleOff}
        onCreate={handleCreateRequisition}
      />
      {canCreateInternalOrderFromARequisition && (
        <CreateOrderModal
          isOpen={createOrderModalController.isOn}
          onClose={() => {
            setSelectedSupplier(undefined);
            createOrderModalController.toggleOff();
          }}
          onRowClick={handleCreateOrderFromRequisition}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
        />
      )}
    </AppBarButtonsPortal>
  );
};
