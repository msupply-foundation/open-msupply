import React from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  ToggleState,
  useNotification,
  FnUtils,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import {
  SupplierSearchModal,
  ExportSelector,
} from '@openmsupply-client/system';
import { useReturns } from '../api';
import { supplierReturnsToCsv } from '../../utils';

interface AppBarButtonsProps {
  modalController: ToggleState;
  onNew: () => void;
}

export const AppBarButtonsComponent = ({
  modalController,
  onNew,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const navigate = useNavigate();

  const { mutateAsync: onCreate } = useReturns.document.insertSupplierReturn();
  const { fetchAsync, isLoading } = useReturns.document.listAllSupplier({
    key: 'createdDateTime',
    direction: 'desc',
    isDesc: true,
  });

  const getCsvData = async () => {
    const data = await fetchAsync();
    return data?.nodes?.length ? supplierReturnsToCsv(data.nodes, t) : null;
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
          filename={t('filename.supplier-returns')}
          isLoading={isLoading}
        />
      </Grid>
      <SupplierSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          try {
            await onCreate({
              id: FnUtils.generateUUID(),
              supplierId: name?.id,
              supplierReturnLines: [],
            }).then(supplierReturn => {
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.SupplierReturn)
                  .addPart(String(supplierReturn?.id))
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
