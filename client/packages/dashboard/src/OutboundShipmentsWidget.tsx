import React, { useState } from 'react';
// TODO: move this into system perhaps
import { CustomerSearch } from '@openmsupply-client/invoices/src/OutboundShipment/ListView/CustomerSearch';
import { OutboundShipmentListViewApi } from '@openmsupply-client/invoices/src/api';
import {
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useListData,
} from '@openmsupply-client/common';
import Widget from './Widget';
import { StatsPanel } from './StatsPanel';
import { useNavigate } from 'react-router';

export const OutboundShipmentsWidget: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { onCreate, invalidate } = useListData(
    { key: 'TYPE' },
    'invoice',
    OutboundShipmentListViewApi
  );

  return (
    <>
      <CustomerSearch
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

      <Widget titleKey="app.inbound-shipments">
        <Grid container justifyContent="flex-start" sx={{ height: '100%' }}>
          <Grid item>
            <StatsPanel
              titleKey="app.inbound-shipments"
              stats={[
                { labelKey: 'label.today', value: 5 },
                { labelKey: 'label.this-week', value: 53 },
              ]}
            />
          </Grid>
          <Grid item flex={1} sx={{ verticalAlign: 'bottom' }}>
            <Grid container>
              <ButtonWithIcon
                Icon={<PlusCircleIcon />}
                labelKey="button.new-inbound-shipment"
                onClick={() => setOpen(true)}
              />
            </Grid>
          </Grid>
        </Grid>
      </Widget>
    </>
  );
};
