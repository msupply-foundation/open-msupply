import React, { FC, useEffect } from 'react';
import {
  Item,
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
  Divider,
  Table,
  Fab,
  TableCell,
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
  PlusCircleIcon,
  generateUUID,
  NumericTextInput,
  formatDate,
  TabContext,
  TabList,
  Tab,
  TabPanel,
} from '@openmsupply-client/common';
import { InboundShipmentItem, InboundShipmentRow } from '../../../types';
import { ItemSearchInput } from '@openmsupply-client/system';
import { flattenInboundItems } from '../../../utils';
interface InboundLineEditProps {
  item: InboundShipmentItem | null;
  onUpsert: (item: InboundShipmentItem) => void;
  onChangeItem: (item: Item | null) => void;
}

const BasicCell: React.FC<TableCellProps> = ({ sx, ...props }) => (
  <TableCell
    {...props}
    sx={{
      borderBottomWidth: 0,
      color: 'inherit',
      fontSize: '12px',
      padding: '0 8px',
      whiteSpace: 'nowrap',
      flex: 1,
      ...sx,
    }}
  />
);

const HeaderCell: React.FC<
  TableCellProps & {
    align?: 'left' | 'center' | 'right' | 'justify' | 'inherit';
  }
> = ({ children, align }) => (
  <BasicCell
    sx={{
      color: theme => theme.typography.body1.color,
      fontWeight: 'bold',
      padding: '8px',
      position: 'sticky',
      width: 125,
      top: 0,
      zIndex: 10,
      backgroundColor: 'white',
      textAlign: align,
    }}
  >
    {children}
  </BasicCell>
);

const EditableCell: FC<{
  onChange: (newValue: string) => void;
  value: unknown;
}> = ({ onChange, value }) => {
  return (
    <BasicCell>
      <BasicTextInput
        sx={{ width: 125 }}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </BasicCell>
  );
};

const BatchRow: FC<{ batch: InboundShipmentRow; label: string }> = ({
  batch,
  label,
}) => {
  return (
    <TableRow sx={{ height: 40 }}>
      <BasicCell>{label}</BasicCell>

      <EditableCell
        onChange={newValue => batch.update?.('batch', newValue)}
        value={batch.batch}
      />

      <BasicCell>
        <NumericTextInput
          onChange={e =>
            batch.update?.('numberOfPacks', Number(e.target.value))
          }
          value={batch.numberOfPacks}
        />
      </BasicCell>
      <BasicCell>
        <NumericTextInput
          value={batch.packSize}
          onChange={e => batch.update?.('packSize', Number(e.target.value))}
        />
      </BasicCell>
      <BasicCell align="right">
        {batch.numberOfPacks * batch.packSize * batch.costPricePerPack}
      </BasicCell>

      <EditableCell
        value={batch.expiryDate}
        onChange={newValue => batch.update?.('expiryDate', newValue)}
      />
      <BasicCell>
        <NumericTextInput value={null} onChange={() => {}} />
      </BasicCell>

      <td style={{ marginBottom: 10 }} />
    </TableRow>
  );
};

const GeneralTable: FC<{ batches: InboundShipmentRow[] }> = ({ batches }) => {
  const t = useTranslation(['outbound-shipment', 'common']);
  return (
    <Table>
      <TableHead>
        <TableRow>
          <HeaderCell />
          <HeaderCell>{t('label.batch')}</HeaderCell>
          <HeaderCell align="right">{t('label.num-packs')}</HeaderCell>
          <HeaderCell align="right">{t('label.pack-size')}</HeaderCell>
          <HeaderCell align="right">Unit Quantity</HeaderCell>
          <HeaderCell>{t('label.expiry')}</HeaderCell>
          <HeaderCell>Location</HeaderCell>
        </TableRow>
      </TableHead>

      {batches.map((batch, index) => (
        <BatchRow
          label={t('label.line', {
            line: index + 1,
          })}
          key={batch.id}
          batch={batch}
        />
      ))}
    </Table>
  );
};

const DiscrepanciesRow: FC<{ batch: InboundShipmentRow; label: string }> = ({
  batch,
  label,
}) => {
  return (
    <TableRow sx={{ height: 40 }}>
      <BasicCell>{label}</BasicCell>
      <EditableCell
        onChange={newValue => batch.update?.('batch', newValue)}
        value={batch.batch}
      />

      <BasicCell align="right" sx={{ width: 125 }}>
        0
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={125} value={0} onChange={() => {}} />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={125} value={0} onChange={() => {}} />
      </BasicCell>
      <BasicCell align="right" sx={{ width: 125 }}>
        0
      </BasicCell>

      <td style={{ marginBottom: 10 }} />
    </TableRow>
  );
};

const DiscrepanciesTable: FC<{ batches: InboundShipmentRow[] }> = ({
  batches,
}) => {
  const t = useTranslation(['outbound-shipment', 'common']);
  return (
    <Table>
      <TableHead>
        <TableRow>
          <HeaderCell />
          <HeaderCell>{t('label.batch')}</HeaderCell>
          <HeaderCell>{t('label.unit-quantity')}</HeaderCell>

          <HeaderCell align="right">Invoice # of Packs</HeaderCell>
          <HeaderCell align="right">Invoice Pack Size</HeaderCell>
          <HeaderCell align="right">Invoice Unit Quantity</HeaderCell>
        </TableRow>
      </TableHead>

      {batches.map((batch, index) => (
        <DiscrepanciesRow
          label={t('label.line', {
            line: index + 1,
          })}
          key={batch.id}
          batch={batch}
        />
      ))}
    </Table>
  );
};

const WeightsBatchRow: FC<{ batch: InboundShipmentRow; label: string }> = ({
  batch,
  label,
}) => {
  return (
    <TableRow sx={{ height: 40 }}>
      <BasicCell>{label}</BasicCell>
      <EditableCell
        onChange={newValue => batch.update?.('batch', newValue)}
        value={batch.batch}
      />

      <BasicCell>
        <NumericTextInput
          width={125}
          value={batch.numberOfPacks}
          onChange={e =>
            batch.update?.('numberOfPacks', Number(e.target.value))
          }
        />
      </BasicCell>

      <BasicCell>
        <NumericTextInput width={125} value={0} />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={125} value={0} onChange={() => {}} />
      </BasicCell>
      <BasicCell align="right" sx={{ width: 125 }}>
        0
      </BasicCell>
      <BasicCell align="right" sx={{ width: 125 }}>
        0
      </BasicCell>

      <td style={{ marginBottom: 10 }} />
    </TableRow>
  );
};

const WeightsTable: FC<{ batches: InboundShipmentRow[] }> = ({ batches }) => {
  const t = useTranslation(['outbound-shipment', 'common']);
  return (
    <Table>
      <TableHead>
        <TableRow>
          <HeaderCell />
          <HeaderCell>{t('label.batch')}</HeaderCell>
          <HeaderCell align="right">{t('label.num-packs')}</HeaderCell>
          <HeaderCell>Volume per Pack</HeaderCell>
          <HeaderCell>Weight per Pack</HeaderCell>
          <HeaderCell align="right">Line total weight</HeaderCell>
          <HeaderCell align="right">Line total volume</HeaderCell>
        </TableRow>
      </TableHead>

      {batches.map((batch, index) => (
        <WeightsBatchRow
          label={t('label.line', {
            line: index + 1,
          })}
          key={batch.id}
          batch={batch}
        />
      ))}
    </Table>
  );
};

const PricingBatchRow: FC<{ batch: InboundShipmentRow; label: string }> = ({
  batch,
  label,
}) => {
  return (
    <TableRow sx={{ height: 40 }}>
      <BasicCell>{label}</BasicCell>
      <EditableCell
        onChange={newValue => batch.update?.('batch', newValue)}
        value={batch.batch}
      />

      <BasicCell>
        <NumericTextInput
          width={125}
          value={batch.sellPricePerPack}
          onChange={e =>
            batch.update?.('sellPricePerPack', Number(e.target.value))
          }
        />
      </BasicCell>

      <BasicCell>
        <NumericTextInput
          width={125}
          value={batch.costPricePerPack}
          onChange={e =>
            batch.update?.('costPricePerPack', Number(e.target.value))
          }
        />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={125} value={null} onChange={() => {}} />
      </BasicCell>
      <BasicCell align="right" sx={{ width: 125 }}>
        {batch.numberOfPacks * batch.packSize * batch.costPricePerPack}
      </BasicCell>

      <td style={{ marginBottom: 10 }} />
    </TableRow>
  );
};

const PricingTable: FC<{ batches: InboundShipmentRow[] }> = ({ batches }) => {
  const t = useTranslation(['outbound-shipment', 'common']);
  return (
    <Table>
      <TableHead>
        <TableRow>
          <HeaderCell />
          <HeaderCell>{t('label.batch')}</HeaderCell>
          <HeaderCell align="right">{t('label.sell')}</HeaderCell>
          <HeaderCell align="right">{t('label.cost')}</HeaderCell>
          <HeaderCell align="right">% Margin</HeaderCell>
          <HeaderCell align="right">Line Total</HeaderCell>
        </TableRow>
      </TableHead>

      {batches.map((batch, index) => (
        <PricingBatchRow
          label={t('label.line', {
            line: index + 1,
          })}
          key={batch.id}
          batch={batch}
        />
      ))}
    </Table>
  );
};

enum Tabs {
  General = 'General',
  Pricing = 'Pricing',
  Weights = 'Weights',
  Discrepancies = 'Discrepancies',
  Custom = 'Custom',
}

export const InboundLineEdit: FC<InboundLineEditProps> = ({
  item,
  onChangeItem,
}) => {
  const t = useTranslation(['outbound-shipment', 'common']);

  const [inboundItem, setInboundItem] =
    React.useState<InboundShipmentItem | null>(item);

  const onAddBatch = () => {
    if (inboundItem) {
      const id = generateUUID();
      inboundItem.batches[id] = {
        id,
        numberOfPacks: 0,
        stockLineId: '',
        invoiceId: '',
        itemId: '',
        note: '',
        costPricePerPack: 0,
        expiryDate: formatDate(new Date()),
        itemCode: '',
        itemName: '',
        packSize: 1,
        sellPricePerPack: 0,
        update: <K extends keyof InboundShipmentRow>(
          key: K,
          value: InboundShipmentRow[K]
        ) => {
          const batch = inboundItem.batches[id];
          if (inboundItem && batch) {
            batch[key] = value;
            setInboundItem({
              ...inboundItem,
              batches: { ...inboundItem.batches, [id]: batch },
            });
          }
        },
      };

      setInboundItem({ ...inboundItem });
    }
  };

  useEffect(() => {
    if (item) setInboundItem({ ...item });
    else setInboundItem(item);
  }, [item]);

  const [currentTab, setCurrentTab] = React.useState<Tabs>(Tabs.General);

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            currentItemName={item?.itemName}
            onChange={onChangeItem}
          />
        </Grid>
      </ModalRow>
      {item && (
        <ModalRow>
          <Grid style={{ display: 'flex', marginTop: 10 }} flex={1}>
            <ModalLabel label={t('label.code')} />
            <BasicTextInput
              disabled
              sx={{ width: 150 }}
              value={item.itemCode}
            />
          </Grid>
          <Grid
            style={{ display: 'flex', marginTop: 10 }}
            justifyContent="flex-end"
            flex={1}
          >
            <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
            <BasicTextInput
              disabled
              sx={{ width: 150 }}
              value={item.itemUnit}
            />
          </Grid>
        </ModalRow>
      )}
      <Divider margin={5} />
      {inboundItem && (
        <TabContext value={currentTab}>
          <TabList
            value={currentTab}
            centered
            onChange={(_, v) => setCurrentTab(v)}
          >
            <Tab value={Tabs.General} label={Tabs.General} />
            <Tab value={Tabs.Pricing} label={Tabs.Pricing} />
            <Tab value={Tabs.Weights} label={Tabs.Weights} />
            <Tab value={Tabs.Discrepancies} label={Tabs.Discrepancies} />
            <Tab value={Tabs.Custom} label={Tabs.Custom} />
          </TabList>

          <TableContainer sx={{ height: 400 }}>
            <TabPanel value={Tabs.General}>
              <GeneralTable batches={flattenInboundItems([inboundItem])} />
            </TabPanel>
            <TabPanel value={Tabs.Pricing}>
              <PricingTable batches={flattenInboundItems([inboundItem])} />
            </TabPanel>
            <TabPanel value={Tabs.Weights}>
              <WeightsTable batches={flattenInboundItems([inboundItem])} />
            </TabPanel>
            <TabPanel value={Tabs.Discrepancies}>
              <DiscrepanciesTable
                batches={flattenInboundItems([inboundItem])}
              />
            </TabPanel>
          </TableContainer>
          <Fab
            sx={{
              alignSelf: 'flex-end',
              maxHeight: 24,
              maxWidth: 24,
              minHeight: 24,
              minWidth: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            color="secondary"
            aria-label="add"
            size="small"
            onClick={onAddBatch}
          >
            <PlusCircleIcon />
          </Fab>
        </TabContext>
      )}
    </>
  );
};
