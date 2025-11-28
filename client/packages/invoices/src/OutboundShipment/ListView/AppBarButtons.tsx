import React, { FC } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FnUtils,
  ToggleState,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { CustomerSearchModal } from '@openmsupply-client/system';
import { useOutbound } from '../api';
import { outboundsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
  simplifiedTabletView?: boolean;
}> = ({ modalController, simplifiedTabletView }) => {
  const navigate = useNavigate();
  const { error } = useNotification();
  const { mutateAsync: onCreate } = useOutbound.document.insert();
  const t = useTranslation();
  const { fetchAsync, isLoading } = useOutbound.document.listAll({
    key: 'createdDateTime',
    direction: 'desc',
    isDesc: true,
  });

  const getCsvData = async () => {
    const data = await fetchAsync();
    return data?.nodes?.length ? outboundsToCsv(data.nodes, t) : null;
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={modalController.toggleOn}
        />
        <CustomerSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={async name => {
            modalController.toggleOff();
            try {
              await onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId: name?.id,
              }).then(invoiceId => {
                navigate(
                  RouteBuilder.create(AppRoute.Distribution)
                    .addPart(AppRoute.OutboundShipment)
                    .addPart(invoiceId)
                    .build()
                );
              });
            } catch (e) {
              const errorSnack = error(
                'Failed to create invoice! ' + (e as Error).message
              );
              errorSnack();
            }
          }}
        />
        {!simplifiedTabletView && (
          <ExportSelector
            getCsvData={getCsvData}
            filename={t('filename.outbounds')}
            isLoading={isLoading}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
