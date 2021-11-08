import React, { useState } from 'react';
import { NameSearchModal } from '@openmsupply-client/system/src/Name';
import { getOutboundShipmentListViewApi } from '@openmsupply-client/invoices/src/OutboundShipment/ListView/api';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useListData,
  useOmSupplyApi,
  useQuery,
} from '@openmsupply-client/common';
import Widget from './Widget';
import { StatsPanel } from '../StatsPanel';
import { useNavigate } from 'react-router';
import { getOutboundShipmentCountQueryFn } from '../api';

export const OutboundShipmentsWidget: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
        open={open}
        onClose={() => setOpen(false)}
        onChange={async name => {
          setOpen(false);

          const createInvoice = async () => {
            const invoice = {
              id: String(Math.ceil(Math.random() * 1000000)),
              nameId: name?.id,
            };

            const result = await onCreate(invoice);

            invalidate();
            navigate(`/distribution/outbound-shipment/${result.id}`);
          };

          createInvoice();
        }}
      />

      <Widget titleKey="app.outbound-shipments">
        <Grid
          container
          justifyContent="flex-start"
          flex={1}
          flexDirection="column"
        >
          <Grid item>
            <StatsPanel
              isLoading={isLoading}
              titleKey="heading.shipments-to-be-picked"
              stats={[
                { labelKey: 'label.today', value: data?.toBePicked || 0 },
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
              labelKey="button.new-outbound-shipment"
              onClick={() => setOpen(true)}
            />
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
