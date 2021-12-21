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
  useTranslation,
  useIsMediumScreen,
  ButtonWithIcon,
  PlusCircleIcon,
  Box,
  StockLine,
} from '@openmsupply-client/common';
import { BatchTable, PricingTable } from './StocktakeLineEditTables';
import { StocktakeLinePanel } from './StocktakeLinePanel';
import { createStocktakeRow, wrapStocktakeItem } from './utils';
import { useStockLines } from '@openmsupply-client/system';
import { createStocktakeItem } from '../../reducer';

interface StocktakeLineEditProps {
  item: StocktakeItem | null;
  onChangeItem: (item: StocktakeItem | null) => void;
  mode: ModalMode;
  draft: StocktakeController;
}

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
}

const createStocktakeLine = (
  item: StocktakeItem,
  stockLine: StockLine,
  countThisLine = true
): StocktakeLine => {
  return {
    stockLineId: stockLine.id,
    itemCode: item.itemCode(),
    itemName: item.itemName(),
    countThisLine,
    ...stockLine,
  };
};

export const StocktakeLineEdit: FC<StocktakeLineEditProps> = ({
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

  const onAddBatch = (seed?: StocktakeLine) => {
    if (wrappedStocktakeItem) {
      wrappedStocktakeItem.upsertLine?.(
        createStocktakeRow(wrappedStocktakeItem, seed)
      );
    }
  };

  const { data } = useStockLines(item?.itemCode() ?? '');

  useEffect(() => {
    if (wrappedStocktakeItem) {
      if (data && data.length > 0) {
        const uncountedLines = data.filter(({ id }) => {
          return (
            wrappedStocktakeItem.lines.find(
              ({ stockLineId }) => id === stockLineId
            ) === undefined
          );
        });

        const stocktakeRows: StocktakeLine[] = uncountedLines.map(line =>
          createStocktakeRow(
            wrappedStocktakeItem,
            createStocktakeLine(
              wrappedStocktakeItem,
              line,
              mode === ModalMode.Create
            )
          )
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
                onClick={() => onAddBatch()}
                label={t('label.add-batch', { ns: 'inventory' })}
                Icon={<PlusCircleIcon />}
              />
            </Box>
          </Box>

          <TableContainer>
            <StocktakeLinePanel
              batches={wrappedStocktakeItem?.lines ?? []}
              value={Tabs.Batch}
            >
              <BatchTable batches={wrappedStocktakeItem?.lines ?? []} />
            </StocktakeLinePanel>

            <StocktakeLinePanel
              batches={wrappedStocktakeItem?.lines ?? []}
              value={Tabs.Pricing}
            >
              <PricingTable batches={wrappedStocktakeItem?.lines ?? []} />
            </StocktakeLinePanel>
          </TableContainer>
        </TabContext>
      ) : (
        <Box sx={{ height: isMediumScreen ? 400 : 500 }} />
      )}
    </>
  );
};
