import React from 'react';
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
import { useRequest } from '@openmsupply-client/requisitions';
import { AppRoute } from '@openmsupply-client/config';
import { ExpiringStockSummary } from './ExpiringStockSummary';
import { StockLevelsSummary } from './StockLevelsSummary';
import { RequestRequisitionCreateModal } from '@openmsupply-client/requisitions';
import { NewRequisitionType } from 'packages/requisitions/src/types';

export const StockWidget = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const modalControl = useToggle(false);
  const { userHasPermission } = useAuthContext();
  const { error: errorNotification } = useNotification();
  const { mutateAsync: onCreate } = useRequest.document.insert();
  const { insert: onProgramCreate } = useRequest.document.insertProgram();

  const handleClick = () => {
    if (!userHasPermission(UserPermission.RequisitionMutate)) {
      errorNotification(t('error-no-internal-order-create-permission'))();
      return;
    }
    modalControl.toggleOn();
  };

  return (
    <>
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
          onCreate={async newRequisition => {
            switch (newRequisition.type) {
              case NewRequisitionType.General:
                return onCreate({
                  id: FnUtils.generateUUID(),
                  otherPartyId: newRequisition.name.id,
                }).then(({ id }) => {
                  modalControl.toggleOff();
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
                }).then(request => {
                  if (request.__typename == 'RequisitionNode') {
                    modalControl.toggleOff();
                    navigate(
                      RouteBuilder.create(AppRoute.Replenishment)
                        .addPart(AppRoute.InternalOrder)
                        .addPart(String(request.id))
                        .build()
                    );
                  }
                });
            }
          }}
        />
      </Widget>
    </>
  );
};
