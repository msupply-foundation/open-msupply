import React, { FC, useEffect } from 'react';
import {
  Item,
  ModalRow,
  ModalLabel,
  Grid,
  useTranslation,
  BasicTextInput,
  Divider,
  Fab,
  TableContainer,
  PlusCircleIcon,
  generateUUID,
  formatDate,
  TabContext,
  TabList,
  Tab,
  TabPanel,
  DataTable,
  useColumns,
  TextInputCell,
  getLineLabelColumn,
  styled,
  NumberInputCell,
  CurrencyInputCell,
  arrayToRecord,
} from '@openmsupply-client/common';
import {
  InboundShipment,
  InboundShipmentItem,
  InboundShipmentRow,
} from '../../../types';
import { ItemSearchInput } from '@openmsupply-client/system';
import { flattenInboundItems } from '../../../utils';
import { ModalMode } from '../DetailView';

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

interface InboundLineEditProps {
  item: InboundShipmentItem | null;
  onUpsert: (item: InboundShipmentItem) => void;
  onChangeItem: (item: Item | null) => void;
  mode: ModalMode;
  draft: InboundShipment;
}

const BatchTable: FC<{ batches: InboundShipmentRow[] }> = ({ batches }) => {
  const columns = useColumns<InboundShipmentRow>([
    getLineLabelColumn(),
    ['batch', { Cell: TextInputCell, width: 200 }],
    [
      'numberOfPacks',
      {
        Cell: NumberInputCell,
        width: 100,
        label: 'label.num-packs',
      },
    ],
    ['packSize', { Cell: NumberInputCell }],
    [
      'unitQuantity',
      { accessor: rowData => rowData.numberOfPacks * rowData.packSize },
    ],
    'expiryDate',
  ]);

  return (
    <DataTable
      columns={columns}
      data={batches}
      noDataMessage="Add a new line"
      dense
    />
  );
};

const PricingTable: FC<{ batches: InboundShipmentRow[] }> = ({ batches }) => {
  const columns = useColumns<InboundShipmentRow>([
    getLineLabelColumn(),
    ['batch', { Cell: TextInputCell, width: 200 }],
    ['sellPricePerPack', { Cell: CurrencyInputCell, width: 100 }],
    ['costPricePerPack', { Cell: CurrencyInputCell, width: 100 }],
    [
      'unitQuantity',
      { accessor: rowData => rowData.numberOfPacks * rowData.packSize },
    ],
    [
      'lineTotal',
      {
        accessor: rowData =>
          rowData.numberOfPacks * rowData.packSize * rowData.costPricePerPack,
      },
    ],
  ]);

  return (
    <DataTable
      columns={columns}
      data={batches}
      noDataMessage="Add a new line"
      dense
    />
  );
};

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
}

const createInboundShipmentBatch = (
  inboundItem: InboundShipmentItem,
  seed?: InboundShipmentRow
) => {
  const id = generateUUID();
  const row = {
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
    ...seed,
    update: (key: string, value: string) => {
      if (key === 'batch') {
        row.batch = value;
      }
      if (key === 'numberOfPacks') {
        row.numberOfPacks = Number(value);
      }
      if (key === 'packSize') {
        row.packSize = Number(value);
      }
      if (key === 'costPricePerPack') {
        row.costPricePerPack = Number(value);
      }
      if (key === 'sellPricePerPack') {
        row.sellPricePerPack = Number(value);
      }

      inboundItem.upsertLine?.(row);
    },
  };

  return row;
};

const wrapInboundShipmentItem = (
  seed: InboundShipmentItem,
  updater: React.Dispatch<React.SetStateAction<InboundShipmentItem | null>>
): InboundShipmentItem => {
  const wrapped = {
    ...seed,
    upsertLine: (row: InboundShipmentRow) => {
      updater(state => {
        if (!state) return state;
        const batches = { ...state.batches, [row.id]: row };
        return { ...state, batches };
      });
    },
  };

  const batches = arrayToRecord(
    Object.values(seed.batches).map(batch =>
      createInboundShipmentBatch(wrapped, batch)
    )
  );

  return { ...wrapped, batches };
};

export const InboundLineEdit: FC<InboundLineEditProps> = ({
  item,
  onChangeItem,
  mode,
  draft,
}) => {
  const t = useTranslation(['distribution', 'common']);

  const [inboundItem, setInboundItem] =
    React.useState<InboundShipmentItem | null>(item);

  const wrappedInbound = inboundItem
    ? wrapInboundShipmentItem(inboundItem, setInboundItem)
    : null;

  const onAddBatch = () => {
    if (wrappedInbound) {
      wrappedInbound.upsertLine?.(createInboundShipmentBatch(wrappedInbound));
    }
  };

  useEffect(() => {
    if (item) setInboundItem({ ...item });
    else setInboundItem(item);
  }, [item]);

  const [currentTab, setCurrentTab] = React.useState<Tabs>(Tabs.Batch);

  return (
    <>
      <ModalRow>
        <ModalLabel label={t('label.item')} />
        <Grid item flex={1}>
          <ItemSearchInput
            disabled={mode === ModalMode.Update}
            currentItem={{
              name: item?.itemName ?? '',
              id: item?.itemId ?? '',
              code: item?.itemCode ?? '',
              isVisible: true,
              availableBatches: [],
              unitName: '',
            }}
            onChange={onChangeItem}
            extraFilter={item => {
              const itemAlreadyInShipment = draft.items.some(
                ({ id }) => id === item.id
              );
              return !itemAlreadyInShipment;
            }}
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
      {wrappedInbound && (
        <TabContext value={currentTab}>
          <TabList
            value={currentTab}
            centered
            onChange={(_, v) => {
              setCurrentTab(v);
            }}
          >
            <Tab value={Tabs.Batch} label={Tabs.Batch} />
            <Tab value={Tabs.Pricing} label={Tabs.Pricing} />
          </TabList>

          <TableContainer sx={{ height: 400 }}>
            <StyledTabPanel value={Tabs.Batch}>
              <BatchTable batches={flattenInboundItems([wrappedInbound])} />
            </StyledTabPanel>

            <StyledTabPanel value={Tabs.Pricing}>
              <PricingTable batches={flattenInboundItems([wrappedInbound])} />
            </StyledTabPanel>
          </TableContainer>
          <Fab
            sx={{
              alignSelf: 'flex-end',
              margin: '10px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            color="secondary"
            aria-label="add"
            onClick={onAddBatch}
          >
            <PlusCircleIcon />
          </Fab>
        </TabContext>
      )}
    </>
  );
};
