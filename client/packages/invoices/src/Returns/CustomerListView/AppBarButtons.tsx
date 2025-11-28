import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  ToggleState,
  useNotification,
  FnUtils,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import {
  CustomerSearchModal,
  ExportSelector,
} from '@openmsupply-client/system';
import { useReturns } from '../api';
import { customerReturnsToCsv } from '../../utils';
import { AppRoute } from '@openmsupply-client/config';

interface AppBarButtonsProps {
  modalController: ToggleState;
  onNew: () => void;
}

export const AppBarButtonsComponent = ({
  modalController,
  onNew,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { error } = useNotification();

  const { mutateAsync: onCreate } = useReturns.document.insertCustomerReturn();
  const { fetchAsync, isLoading } = useReturns.document.listAllCustomer({
    key: 'createdDateTime',
    direction: 'desc',
    isDesc: true,
  });

  const getCsvData = async () => {
    const data = await fetchAsync();
    return data?.nodes?.length ? customerReturnsToCsv(data.nodes, t) : null;
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-return')}
          onClick={onNew}
        />
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.customer-returns')}
          isLoading={isLoading}
        />
      </Grid>
      <CustomerSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          try {
            await onCreate({
              id: FnUtils.generateUUID(),
              customerId: name?.id,
              customerReturnLines: [],
            }).then(customerReturn => {
              navigate(
                RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerReturn)
                  .addPart(String(customerReturn?.id))
                  .build()
              );
            });
          } catch (e) {
            const errorSnack = error(
              `${t('error.failed-to-create-return')} ${(e as Error).message}`
            );
            errorSnack();
          }
        }}
      />
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
