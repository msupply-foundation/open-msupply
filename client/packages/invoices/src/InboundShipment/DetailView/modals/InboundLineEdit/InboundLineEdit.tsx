import React, { FC, useCallback, useState, useEffect } from 'react';
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
  BasicSpinner,
  DialogButton,
  useDialog,
  useNotification,
  ModalMode,
  useDirtyCheck,
  useConfirmOnLeaving,
  TableProvider,
  createTableStore,
  TabKeybindings,
  createQueryParamsStore,
  useKeyboardHeightAdjustment,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { InboundLineEditPanel } from './InboundLineEditPanel';
import { QuantityTable, PricingTable, LocationTable } from './TabTables';
import { InboundLineEditForm } from './InboundLineEditForm';
import { useInbound } from '../../../api';
import { DraftInboundLine } from '../../../../types';
import { CreateDraft } from '../utils';

interface InboundLineEditProps {
  item: ItemRowFragment | null;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  isDisabled?: boolean;
}

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
  Location = 'Location',
}

const useDraftInboundLines = (item: ItemRowFragment | null) => {
  const { data: lines } = useInbound.lines.list(item?.id ?? '');
  const { id } = useInbound.document.fields('id');
  const { mutateAsync, isLoading } = useInbound.lines.save();
  const [draftLines, setDraftLines] = useState<DraftInboundLine[]>([]);
  const { isDirty, setIsDirty } = useDirtyCheck();
  useConfirmOnLeaving(isDirty);

  useEffect(() => {
    if (lines && item) {
      const drafts = lines.map(line =>
        CreateDraft.stockInLine({
          item: line.item,
          invoiceId: line.invoiceId,
          seed: line,
        })
      );
      if (drafts.length === 0)
        drafts.push(CreateDraft.stockInLine({ item, invoiceId: id }));
      setDraftLines(drafts);
    } else {
      setDraftLines([]);
    }
  }, [lines, item]);

  const addDraftLine = () => {
    if (item) {
      const newLine = CreateDraft.stockInLine({ item, invoiceId: id });
      setIsDirty(true);
      setDraftLines([]);
      setTimeout(() => setDraftLines([...draftLines, newLine]), 10);
    }
  };

  const updateDraftLine = useCallback(
    (patch: Partial<DraftInboundLine> & { id: string }) => {
      const batch = draftLines.find(line => line.id === patch.id);

      if (batch) {
        const newBatch = { ...batch, ...patch, isUpdated: true };
        const index = draftLines.indexOf(batch);
        draftLines[index] = newBatch;
        setIsDirty(true);
        setDraftLines([...draftLines]);
      }
    },
    [draftLines, setDraftLines]
  );

  const saveLines = async () => {
    if (isDirty) await mutateAsync(draftLines);
    setIsDirty(false);
  };

  return {
    draftLines,
    addDraftLine,
    updateDraftLine,
    isLoading,
    saveLines,
  };
};

export const InboundLineEdit: FC<InboundLineEditProps> = ({
  item,
  mode,
  isOpen,
  onClose,
  isDisabled = false,
}) => {
  const t = useTranslation('replenishment');
  const { error } = useNotification();
  const [currentItem, setCurrentItem] = useState<ItemRowFragment | null>(item);
  const { next: nextItem, disabled: nextDisabled } = useInbound.document.next(
    currentItem?.id ?? ''
  );
  const isMediumScreen = useIsMediumScreen();
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Batch);
  const { Modal } = useDialog({ isOpen, onClose });
  const height = useKeyboardHeightAdjustment(600);
  const { draftLines, addDraftLine, updateDraftLine, isLoading, saveLines } =
    useDraftInboundLines(currentItem);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;
  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
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
            disabled={okNextDisabled}
            onClick={async () => {
              await saveLines();
              if (mode === ModalMode.Update && nextItem) {
                setCurrentItem(nextItem);
              } else if (mode === ModalMode.Create) setCurrentItem(null);
              else onClose();
              // Returning true here triggers the slide animation
              return true;
            }}
          />
        }
        okButton={
          <DialogButton
            variant="ok"
            disabled={!currentItem}
            onClick={async () => {
              try {
                await saveLines();
                onClose();
              } catch (e) {
                error((error as unknown as Error).message);
              }
            }}
          />
        }
        height={height}
        width={1024}
      >
        {isLoading ? (
          <BasicSpinner messageKey="saving" />
        ) : (
          <>
            <InboundLineEditForm
              disabled={mode === ModalMode.Update}
              item={currentItem}
              onChangeItem={setCurrentItem}
            />
            <Divider margin={5} />
            {draftLines.length > 0 ? (
              <TabContext value={currentTab}>
                <TabKeybindings
                  tabs={[Tabs.Batch, Tabs.Pricing, Tabs.Location]}
                  onAdd={addDraftLine}
                  setCurrentTab={setCurrentTab}
                  dependencies={[draftLines]}
                />

                <Box flex={1} display="flex" justifyContent="space-between">
                  <Box flex={1} />
                  <Box flex={1}>
                    <TabList
                      value={currentTab}
                      centered
                      onChange={(_, v) => setCurrentTab(v)}
                    >
                      <Tab
                        value={Tabs.Batch}
                        label={`${t('label.quantities')} (Ctrl+1)`}
                        tabIndex={-1}
                      />
                      <Tab
                        value={Tabs.Pricing}
                        label={`${t('label.pricing')} (Ctrl+2)`}
                        tabIndex={-1}
                      />
                      <Tab
                        value={Tabs.Location}
                        label={`${t('label.location')} (Ctrl+3)`}
                        tabIndex={-1}
                      />
                    </TabList>
                  </Box>
                  <Box flex={1} justifyContent="flex-end" display="flex">
                    <ButtonWithIcon
                      disabled={isDisabled}
                      color="primary"
                      variant="outlined"
                      onClick={addDraftLine}
                      label={`${t('label.add-batch')} (+)`}
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
                  <InboundLineEditPanel value={Tabs.Batch}>
                    <QuantityTable
                      isDisabled={isDisabled}
                      lines={draftLines}
                      updateDraftLine={updateDraftLine}
                    />
                  </InboundLineEditPanel>

                  <InboundLineEditPanel value={Tabs.Pricing}>
                    <PricingTable
                      isDisabled={isDisabled}
                      lines={draftLines}
                      updateDraftLine={updateDraftLine}
                    />
                  </InboundLineEditPanel>

                  <InboundLineEditPanel value={Tabs.Location}>
                    <LocationTable
                      isDisabled={isDisabled}
                      lines={draftLines}
                      updateDraftLine={updateDraftLine}
                    />
                  </InboundLineEditPanel>
                </TableContainer>
              </TabContext>
            ) : (
              <Box sx={{ height: isMediumScreen ? 400 : 500 }} />
            )}
          </>
        )}
      </Modal>
    </TableProvider>
  );
};
