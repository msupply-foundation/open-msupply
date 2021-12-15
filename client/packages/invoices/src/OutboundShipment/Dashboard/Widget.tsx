import React, { useState } from 'react';
import { NameSearchModal } from '@openmsupply-client/system/src/Name';
import { getOutboundShipmentListViewApi } from '../ListView/api';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useListData,
  useNotification,
  useOmSupplyApi,
  useQuery,
  useTranslation,
  StatsPanel,
  Widget,
  useNavigate,
} from '@openmsupply-client/common';
import { getOutboundShipmentCountQueryFn } from './api';

export const OutboundShipmentWidget: React.FC = () => {
  const { error } = useNotification();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const t = useTranslation(['app', 'dashboard']);

  const { api } = useOmSupplyApi();
  const { onCreate, invalidate } = useListData(
    { initialSortBy: { key: 'otherPartyName' } },
    'invoice',
    getOutboundShipmentListViewApi(api)
  );
  const { data, isLoading } = useQuery(
    ['outound-shipment', 'count'],
    getOutboundShipmentCountQueryFn(api),
    { retry: false }
  );

  return (
    <>
      <NameSearchModal
        type="customer"
        open={open}
        onClose={() => setOpen(false)}
        onChange={async name => {
          setOpen(false);

          const createInvoice = async () => {
            const invoice = {
              id: String(Math.ceil(Math.random() * 1000000)),
              nameId: name?.id,
            };

            try {
              const result = await onCreate(invoice);
              invalidate();
              navigate(`/distribution/outbound-shipment/${result}`);
            } catch (e) {
              const errorSnack = error(
                'Failed to create invoice! ' + (e as Error).message
              );
              errorSnack();
            }
          };

          createInvoice();
        }}
      />

      <Widget title={t('outbound-shipments')}>
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid item>
            <StatsPanel
              isLoading={isLoading}
              title={t('heading.shipments-to-be-picked')}
              stats={[
                {
                  label: t('label.today', { ns: 'dashboard' }),
                  value: data?.toBePicked || 0,
                },
              ]}
            />
          </Grid>
          <Grid
            item
            flex={1}
            container
            justifyContent="flex-end"
            alignItems="flex-end"
          >
            <ButtonWithIcon
              variant="contained"
              color="secondary"
              Icon={<PlusCircleIcon />}
              label={t('button.new-outbound-shipment')}
              onClick={() => setOpen(true)}
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
