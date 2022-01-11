import React, { FC, useState, useEffect } from 'react';
import {
  useDialog,
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
  Item,
  ModalMode,
  DialogButton,
} from '@openmsupply-client/common';
import { BatchTable, PricingTable } from './StocktakeLineEditTables';
import { StocktakeLinePanel } from './StocktakeLinePanel';
import { StocktakeLineEditForm } from './StocktakeLineEditForm';
import { useStocktakeLineEdit } from './hooks';
import { useSaveStocktakeLines } from 'packages/inventory/src/Stocktake/api';

interface StocktakeLineEditProps {
  item: Item | null;
  mode: ModalMode;
  onClose: () => void;
  isOpen: boolean;
}

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
}

export const StocktakeLineEdit: FC<StocktakeLineEditProps> = ({
  item,
  mode,
  onClose,
  isOpen,
}) => {
  const { Modal } = useDialog({ onClose, isOpen });
  const [currentItem, setCurrentItem] = useState(item);
  const [currentTab, setCurrentTab] = useState(Tabs.Batch);
  const isMediumScreen = useIsMediumScreen();
  const t = useTranslation(['common', 'inventory']);
  const { draftLines, update } = useStocktakeLineEdit(item);
  const { mutate } = useSaveStocktakeLines();

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.add-item')
          : t('heading.edit-item')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          variant="next"
          onClick={() => {}}
          disabled={mode === ModalMode.Update}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            await mutate(draftLines);
          }}
        />
      }
      height={600}
      width={1024}
    >
      <>
        <StocktakeLineEditForm
          item={currentItem}
          onChangeItem={setCurrentItem}
          mode={mode}
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
                  onClick={() => {}}
                  label={t('label.add-batch', { ns: 'inventory' })}
                  Icon={<PlusCircleIcon />}
                />
              </Box>
            </Box>

            <TableContainer>
              <StocktakeLinePanel
                batches={draftLines}
                update={update}
                value={Tabs.Batch}
              >
                <BatchTable batches={draftLines} update={update} />
              </StocktakeLinePanel>

              <StocktakeLinePanel
                batches={draftLines}
                update={update}
                value={Tabs.Pricing}
              >
                <PricingTable batches={draftLines} update={update} />
              </StocktakeLinePanel>
            </TableContainer>
          </TabContext>
        ) : (
          <Box sx={{ height: isMediumScreen ? 400 : 500 }} />
        )}
      </>
    </Modal>
  );
};
