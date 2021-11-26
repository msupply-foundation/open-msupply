import React, { FC, useEffect } from 'react';
import {
  Divider,
  Fab,
  TableContainer,
  PlusCircleIcon,
  TabContext,
  TabList,
  Tab,
  TabPanel,
  styled,
  BaseButton,
  useTranslation,
  alpha,
  useIsMediumScreen,
} from '@openmsupply-client/common';
import { InboundShipment, InboundShipmentItem } from '../../../../types';
import { flattenInboundItems } from '../../../../utils';
import { ModalMode } from '../../DetailView';
import { BatchTable, PricingTable } from './TabTables';
import { createInboundShipmentBatch, wrapInboundShipmentItem } from './utils';
import { InboundLineEditForm } from './InboundLineEditForm';
import { Box } from '@mui/system';

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

interface InboundLineEditProps {
  item: InboundShipmentItem | null;
  onChangeItem: (item: InboundShipmentItem | null) => void;
  mode: ModalMode;
  draft: InboundShipment;
}

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
}

export const InboundLineEdit: FC<InboundLineEditProps> = ({
  item,
  onChangeItem,
  mode,
  draft,
}) => {
  const t = useTranslation('distribution');
  const isMediumScreen = useIsMediumScreen();
  const [currentTab, setCurrentTab] = React.useState<Tabs>(Tabs.Batch);
  const wrappedInbound = item
    ? wrapInboundShipmentItem(item, onChangeItem)
    : null;

  const batches = wrappedInbound ? flattenInboundItems([wrappedInbound]) : [];

  const onAddBatch = () => {
    if (wrappedInbound) {
      wrappedInbound.upsertLine?.(createInboundShipmentBatch(wrappedInbound));
    }
  };

  useEffect(() => {
    if (
      wrappedInbound?.batches &&
      Object.values(wrappedInbound?.batches).length === 0
    ) {
      onAddBatch();
    }
  });

  return (
    <>
      <InboundLineEditForm
        draft={draft}
        mode={mode}
        item={item}
        onChangeItem={onChangeItem}
      />
      <Divider margin={5} />
      {wrappedInbound ? (
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
              <BaseButton
                color="primary"
                variant="outlined"
                onClick={onAddBatch}
              >
                {t('label.add-batch')}
              </BaseButton>
            </Box>
          </Box>

          <TableContainer
            sx={{
              height: isMediumScreen ? 300 : 400,
              marginTop: 2,
              backgroundColor: theme => alpha(theme.palette.gray.pale, 0.5),
              borderRadius: '20px',
            }}
          >
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
