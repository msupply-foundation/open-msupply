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
      ...sx,
    }}
  />
);

const HeaderCell: React.FC<TableCellProps> = ({ children }) => (
  <BasicCell
    sx={{
      color: theme => theme.typography.body1.color,
      fontWeight: 'bold',
      padding: '8px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backgroundColor: 'white',
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
        sx={{ width: 50 }}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </BasicCell>
  );
};

const BatchRow: FC<{ batch: InboundShipmentRow }> = ({ batch }) => {
  return (
    <TableRow sx={{ height: 40 }}>
      <EditableCell
        onChange={newValue => batch.update?.('batch', newValue)}
        value={batch.batch}
      />

      <BasicCell>
        <NumericTextInput
          onChange={e =>
            batch.update?.('numberOfPacks', Number(e.target.value))
          }
          width={30}
          value={batch.numberOfPacks}
        />
      </BasicCell>
      <BasicCell>
        <NumericTextInput
          width={30}
          value={batch.packSize}
          onChange={e =>
            batch.update?.('numberOfPacks', Number(e.target.value))
          }
        />
      </BasicCell>

      <BasicCell>
        <NumericTextInput
          width={30}
          value={batch.sellPricePerPack}
          onChange={e =>
            batch.update?.('numberOfPacks', Number(e.target.value))
          }
        />
      </BasicCell>
      <BasicCell>
        {batch.numberOfPacks * batch.packSize * batch.costPricePerPack}
      </BasicCell>
      <BasicCell>
        <NumericTextInput
          width={30}
          value={batch.costPricePerPack}
          onChange={e =>
            batch.update?.('numberOfPacks', Number(e.target.value))
          }
        />
      </BasicCell>
      <BasicCell align="right">
        {batch.numberOfPacks * batch.packSize}
      </BasicCell>
      <EditableCell
        value={batch.expiryDate}
        onChange={newValue => batch.update?.('expiryDate', newValue)}
      />
      <BasicCell>
        <NumericTextInput width={30} value={null} onChange={() => {}} />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={30} value={null} onChange={() => {}} />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={30} value={null} onChange={() => {}} />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={30} value={null} onChange={() => {}} />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={30} value={null} onChange={() => {}} />
      </BasicCell>
      <BasicCell>
        <NumericTextInput width={30} value={null} onChange={() => {}} />
      </BasicCell>

      <td style={{ marginBottom: 10 }} />
    </TableRow>
  );
};

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
        <TableContainer sx={{ height: 400 }}>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderCell>{t('label.batch')}</HeaderCell>
                <HeaderCell>{t('label.num-packs')}</HeaderCell>
                <HeaderCell>{t('label.pack-size')}</HeaderCell>

                <HeaderCell>{t('label.sell')}</HeaderCell>
                <HeaderCell>{t('label.cost')}</HeaderCell>
                <HeaderCell>Line Total</HeaderCell>
                <HeaderCell>Units</HeaderCell>
                <HeaderCell>{t('label.expiry')}</HeaderCell>
                <HeaderCell>% Margin</HeaderCell>

                <HeaderCell>
                  Volume/
                  <br />
                  Pack
                </HeaderCell>
                <HeaderCell>
                  Weight/
                  <br />
                  Pack
                </HeaderCell>
                <HeaderCell>Location</HeaderCell>
                <HeaderCell>
                  Sent # <br /> Packs
                </HeaderCell>
                <HeaderCell>
                  Sent Pack <br /> Size
                </HeaderCell>
              </TableRow>
            </TableHead>

            {flattenInboundItems([inboundItem]).map(batch => (
              <BatchRow key={batch.id} batch={batch} />
            ))}

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
          </Table>
        </TableContainer>
      )}
    </>
  );
};
