import React, { useState } from 'react';
import {
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  ToggleState,
  FnUtils,
  RouteBuilder,
  ButtonWithIcon,
  PlusCircleIcon,
  useNavigate,
  usePreferences,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
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

  const getCsvData = async () => {
    const data = await mutateAsync();
    return data?.nodes?.length ? responsesToCsv(data.nodes, t) : null;
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
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.responses')}
          isLoading={isLoading}
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
