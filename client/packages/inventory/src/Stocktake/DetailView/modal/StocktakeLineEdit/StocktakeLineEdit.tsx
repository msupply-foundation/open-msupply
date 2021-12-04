import React, { FC } from 'react';
import { StocktakeController, StocktakeItem } from '../../../../types';
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
} from '@openmsupply-client/common';
import { BatchTable, PricingTable } from './StocktakeLineEditTables';
import { createStocktakeRow, wrapStocktakeItem } from './utils';

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

export const StocktakeLineEdit: FC<StocktakeLineEditProps> = ({
  item,
  draft,
  onChangeItem,
  mode,
}) => {
  const [currentTab, setCurrentTab] = React.useState<Tabs>(Tabs.Batch);
  const isMediumScreen = useIsMediumScreen();
  const t = useTranslation(['common', 'inventory']);

  const wrappedStocktakeItem = item
    ? wrapStocktakeItem(item, onChangeItem)
    : null;

  const batches = wrappedStocktakeItem ? wrappedStocktakeItem.lines : [];

  const onAddBatch = () => {
    if (wrappedStocktakeItem) {
      wrappedStocktakeItem.upsertLine?.(
        createStocktakeRow(wrappedStocktakeItem)
      );
    }
  };

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
                label={t('label.add-line')}
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
