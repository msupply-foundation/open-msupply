import React, { useCallback } from 'react';
import {
  ButtonWithIcon,
  FnUtils,
  Grid,
  PlusCircleIcon,
  RouteBuilder,
  useAuthContext,
  useNavigate,
  useNotification,
  UserPermission,
  useToggle,
  useTranslation,
  Widget,
} from '@openmsupply-client/common';
import {
  NewRequisitionType,
  useRequest,
  RequestRequisitionCreateModal,
  NewGeneralOrder,
  NewProgramRequisition,
} from '@openmsupply-client/requisitions';
import { AppRoute } from '@openmsupply-client/config';
import { ExpiringStockSummary } from './ExpiringStockSummary';
import { StockLevelsSummary } from './StockLevelsSummary';

export const StockWidget = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const modalControl = useToggle(false);
  const { userHasPermission } = useAuthContext();
  const { error: errorNotification } = useNotification();
  const { mutateAsync: onCreate } = useRequest.document.insert();
  const { insert: onProgramCreate } = useRequest.document.insertProgram();

  const handleClick = useCallback(() => {
    if (!userHasPermission(UserPermission.RequisitionMutate)) {
      errorNotification(t('error-no-internal-order-create-permission'))();
      return;
    }
    modalControl.toggleOn();
  }, [userHasPermission, errorNotification, t, modalControl]);

  const navigateToInternalOrder = useCallback(
    (requisitionId: string) => {
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.InternalOrder)
          .addPart(requisitionId)
          .build()
      );
    },
    [navigate]
  );

  const handleCreateRequisition = useCallback(
    async (newRequisition: NewGeneralOrder | NewProgramRequisition) => {
      try {
        switch (newRequisition.type) {
          case NewRequisitionType.General: {
            const { id } = await onCreate({
              id: FnUtils.generateUUID(),
              otherPartyId: newRequisition.name.id,
            });
            modalControl.toggleOff();
            navigateToInternalOrder(id);
            break;
          }
          case NewRequisitionType.Program: {
            const { type: _, ...rest } = newRequisition;
            const result = await onProgramCreate({
              id: FnUtils.generateUUID(),
              ...rest,
            });
            if (result.__typename === 'RequisitionNode') {
              modalControl.toggleOff();
              navigateToInternalOrder(String(result.id));
            }
            break;
          }
        }
      } catch (error) {
        errorNotification(
          t('error.failed-to-create-requisition', {
            message: (error as Error).message ?? '',
          })
        )();
      }
    },
    [
      onCreate,
      onProgramCreate,
      modalControl,
      errorNotification,
      navigateToInternalOrder,
    ]
  );

  return (
    <Widget title={t('inventory-management')}>
      <Grid
        container
        justifyContent="flex-start"
        flex={1}
        flexDirection="column"
      >
        <Grid>
          <ExpiringStockSummary />
          <StockLevelsSummary />
        </Grid>
        <Grid
          flex={1}
          container
          justifyContent="flex-end"
          alignItems="flex-end"
        >
          <ButtonWithIcon
            variant="contained"
            color="secondary"
            Icon={<PlusCircleIcon />}
            label={t('button.order-more')}
            onClick={handleClick}
          />
        </Grid>
      </Grid>
      <RequestRequisitionCreateModal
        isOpen={modalControl.isOn}
        onClose={modalControl.toggleOff}
        onCreate={handleCreateRequisition}
      />
    </Widget>
  );
};
