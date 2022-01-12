import React, { FC, useState } from 'react';
import {
  BasicSpinner,
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
  useNotification,
  DialogButton,
} from '@openmsupply-client/common';
import { BatchTable, PricingTable } from './StocktakeLineEditTables';
import { StocktakeLinePanel } from './StocktakeLinePanel';
import { StocktakeLineEditForm } from './StocktakeLineEditForm';
import { useStocktakeLineEdit } from './hooks';

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
  const { error } = useNotification();
  const { Modal } = useDialog({ onClose, isOpen });
  const [currentItem, setCurrentItem] = useState(item);
  const [currentTab, setCurrentTab] = useState(Tabs.Batch);
  const isMediumScreen = useIsMediumScreen();
  const t = useTranslation(['common', 'inventory']);

  const { draftLines, update, addLine, isLoading, save, nextItem } =
    useStocktakeLineEdit(currentItem);

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
          onClick={async () => {
            try {
              await save(draftLines);
              if (nextItem) setCurrentItem(nextItem);
              else onClose();

              // Returning true here triggers the slide animation
              return true;
            } catch (e) {
              //
            }
          }}
          disabled={mode !== ModalMode.Update}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              await save(draftLines);
              onClose();
            } catch (e) {
              error(t('error.cant-save'))();
            }
          }}
        />
      }
      height={600}
      width={1024}
    >
      {!isLoading ? (
        <>
          <StocktakeLineEditForm
            item={currentItem}
            onChangeItem={setCurrentItem}
            mode={mode}
          />
          <Divider margin={5} />
          {currentItem ? (
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
                    onClick={addLine}
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
      ) : (
        <Box sx={{ height: isMediumScreen ? 350 : 450 }}>
          <BasicSpinner messageKey="saving" />
        </Box>
      )}
    </Modal>
  );
};
