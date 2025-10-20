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
import {
  InternalSupplierSearchModal,
  NameRowFragment,
} from '@openmsupply-client/system';
import { useRequest } from '@openmsupply-client/requisitions';
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

  const handleClick = () => {
    if (!userHasPermission(UserPermission.RequisitionMutate)) {
      errorNotification(t('error-no-internal-order-create-permission'))();
      return;
    }
    modalControl.toggleOn();
  };

  const onError = (e: unknown) =>
    errorNotification(
      t('error.failed-to-create-requisition', {
        message: (e as Error).message ?? '',
      })
    )();

  const handleModalChange = async ({ id: otherPartyId }: NameRowFragment) => {
    modalControl.toggleOff();
    try {
      const result = await onCreate(
        {
          id: FnUtils.generateUUID(),
          otherPartyId,
        },
        { onError }
      );
      if (result)
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InternalOrder)
            .addPart(result.id)
            .build()
        );
    } catch (e) {
      // onError is already managing error state
    }
  };

  return (
    <>
      {modalControl.isOn ? (
        <InternalSupplierSearchModal
          open={true}
          onClose={modalControl.toggleOff}
          onChange={handleModalChange}
        />
      ) : null}
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
      </Widget>
    </>
  );
};
