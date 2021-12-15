import React, { FC, useEffect } from 'react';
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
  BasicSpinner,
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
  loading: boolean;
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
  loading,
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

  return loading ? (
    <BasicSpinner />
  ) : (
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
              <ButtonWithIcon
                color="primary"
                variant="outlined"
                onClick={onAddBatch}
                label={t('label.add-batch')}
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
