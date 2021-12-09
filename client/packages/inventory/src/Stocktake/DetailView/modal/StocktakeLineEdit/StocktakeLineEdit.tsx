import React, { FC, useEffect } from 'react';
import {
  StocktakeController,
  StocktakeItem,
  StocktakeLine,
} from '../../../../types';
import { ModalMode } from '../../DetailView';
import { StocktakeLineEditForm } from './StocktakeLineEditForm';
import {
  Divider,
  TableContainer,
  TabContext,
  TabList,
  Tab,
  alpha,
  TabPanel,
  styled,
  useTranslation,
  useIsMediumScreen,
  ButtonWithIcon,
  PlusCircleIcon,
  Box,
  StockLine,
  TableProvider,
  createTableStore,
  useTableStore,
} from '@openmsupply-client/common';
import { BatchTable, PricingTable } from './StocktakeLineEditTables';
import { createStocktakeRow, wrapStocktakeItem } from './utils';
import { useStockLines } from '@openmsupply-client/system';
import { createStocktakeItem } from '../../reducer';

interface StocktakeLineEditProps {
  item: StocktakeItem | null;
  onChangeItem: (item: StocktakeItem | null) => void;
  mode: ModalMode;
  draft: StocktakeController;
}

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
}

const createStocktakeLine = (stockLine: StockLine): StocktakeLine => {
  return {
    id: stockLine.id,
    stockLineId: stockLine.id,
    ...stockLine,
  };
};

export const StocktakeLineEditComponent: FC<StocktakeLineEditProps> = ({
  item,
  draft,
  onChangeItem,
  mode,
}) => {
  const [currentTab, setCurrentTab] = React.useState<Tabs>(Tabs.Batch);
  const isMediumScreen = useIsMediumScreen();
  const t = useTranslation(['common', 'inventory']);

  const [wrappedStocktakeItem, setWrappedStocktakeItem] =
    React.useState<StocktakeItem | null>(
      item ? wrapStocktakeItem(item, onChangeItem) : null
    );

  React.useEffect(() => {
    setWrappedStocktakeItem(
      item ? wrapStocktakeItem(item, onChangeItem) : null
    );
  }, [item]);

  const [batches, setBatches] = React.useState(
    wrappedStocktakeItem ? wrappedStocktakeItem.lines : []
  );

  const { selectedRows } = useTableStore(
    state => ({
      selectedRows: Object.keys(state.rowState).filter(
        id => state.rowState[id]?.isSelected
      ),
    }),
    (oldState, newState) =>
      JSON.stringify(oldState) === JSON.stringify(newState)
  );

  React.useEffect(() => {
    if (wrappedStocktakeItem) {
      const { lines } = wrappedStocktakeItem;
      const checkedRows = lines.filter(line => selectedRows.includes(line.id));
      const unCheckedRows = lines.filter(
        line => !selectedRows.includes(line.id)
      );
      setBatches([...checkedRows, ...unCheckedRows]);
    }
  }, [wrappedStocktakeItem, selectedRows]);

  const onAddBatch = (seed?: StocktakeLine) => {
    if (wrappedStocktakeItem) {
      wrappedStocktakeItem.upsertLine?.(
        createStocktakeRow(wrappedStocktakeItem, seed)
      );
    }
  };

  const { data } = useStockLines(item?.itemCode());

  useEffect(() => {
    if (wrappedStocktakeItem) {
      if (data?.length > 0) {
        const uncountedLines = data.filter(({ id }) => {
          return (
            wrappedStocktakeItem.lines.find(
              ({ stockLineId }) => id === stockLineId
            ) === undefined
          );
        });

        const stocktakeRows: StocktakeLine[] = uncountedLines.map(line =>
          createStocktakeRow(wrappedStocktakeItem, createStocktakeLine(line))
        );

        const updated = createStocktakeItem(wrappedStocktakeItem.id, [
          ...wrappedStocktakeItem.lines,
          ...stocktakeRows,
        ]);

        onChangeItem(updated);
      }
    }
  }, [wrappedStocktakeItem?.id, data]);

  return (
    <>
      <StocktakeLineEditForm
        item={item}
        onChangeItem={onChangeItem}
        mode={mode}
        draft={draft}
      />
      <Divider margin={5} />
      {item ? (
        <TabContext value={currentTab}>
          <Box flex={1} display="flex" justifyContent="space-between">
            <Box flex={1} />
            <Box flex={1}>
              <TabList
                value={currentTab}
                centered
                onChange={(_, v) => setCurrentTab(v)}
              >
                <Tab value={Tabs.Batch} label={Tabs.Batch} />
                <Tab value={Tabs.Pricing} label={Tabs.Pricing} />
              </TabList>
            </Box>
            <Box flex={1} justifyContent="flex-end" display="flex">
              <ButtonWithIcon
                color="primary"
                variant="outlined"
                onClick={onAddBatch}
                label={t('label.add-batch', { ns: 'inventory' })}
                Icon={<PlusCircleIcon />}
              />
            </Box>
          </Box>

          <TableContainer
            sx={{
              height: isMediumScreen ? 300 : 400,
              marginTop: 2,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'divider',
              borderRadius: '20px',
            }}
          >
            <Box
              sx={{
                width: 400,
                height: isMediumScreen ? 300 : 400,
                backgroundColor: theme =>
                  alpha(theme.palette['background']['menu'], 0.4),
                position: 'absolute',
                borderRadius: '20px',
              }}
            />
            <StyledTabPanel value={Tabs.Batch}>
              <BatchTable batches={batches} />
            </StyledTabPanel>

            <StyledTabPanel value={Tabs.Pricing}>
              <PricingTable batches={batches} />
            </StyledTabPanel>
          </TableContainer>
        </TabContext>
      ) : (
        <Box sx={{ height: isMediumScreen ? 400 : 500 }} />
      )}
    </>
  );
};

export const StocktakeLineEdit: FC<StocktakeLineEditProps> = ({
  item,
  draft,
  onChangeItem,
  mode,
}) => {
  return (
    <TableProvider createStore={createTableStore}>
      <StocktakeLineEditComponent
        item={item}
        draft={draft}
        onChangeItem={onChangeItem}
        mode={mode}
      />
    </TableProvider>
  );
};
