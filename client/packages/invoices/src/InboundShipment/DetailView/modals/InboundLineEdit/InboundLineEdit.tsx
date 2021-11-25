import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { InboundShipment, InboundShipmentItem } from '../../../../types';
import { flattenInboundItems } from '../../../../utils';
import { ModalMode } from '../../DetailView';
import { BatchTable, PricingTable } from './TabTables';
import { createInboundShipmentBatch, wrapInboundShipmentItem } from './utils';
import { InboundLineEditForm } from './InboundLineEditForm';

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

  return (
    <>
      <InboundLineEditForm
        draft={draft}
        mode={mode}
        item={item}
        onChangeItem={onChangeItem}
      />
      <Divider margin={5} />
      {wrappedInbound && (
        <TabContext value={currentTab}>
          <TabList
            value={currentTab}
            centered
            onChange={(_, v) => setCurrentTab(v)}
          >
            <Tab value={Tabs.Batch} label={Tabs.Batch} />
            <Tab value={Tabs.Pricing} label={Tabs.Pricing} />
          </TabList>

          <TableContainer sx={{ height: 400 }}>
            <StyledTabPanel value={Tabs.Batch}>
              <BatchTable batches={batches} />
            </StyledTabPanel>

            <StyledTabPanel value={Tabs.Pricing}>
              <PricingTable batches={batches} />
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
