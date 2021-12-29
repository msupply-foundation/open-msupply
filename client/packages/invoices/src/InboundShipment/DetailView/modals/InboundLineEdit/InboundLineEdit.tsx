import React, { FC, useState, useEffect } from 'react';
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
  generateUUID,
  Item,
  useNotification,
} from '@openmsupply-client/common';
import { InvoiceLine } from '../../../../types';
import { ModalMode } from '../../DetailView';
import { QuantityTable, PricingTable, LocationTable } from './TabTables';
import { InboundLineEditForm } from './InboundLineEditForm';
import {
  useInboundLines,
  useInboundFields,
  useSaveInboundLines,
  useNextItem,
} from '../../api';
import { InboundLineEditPanel } from './InboundLineEditPanel';

interface InboundLineEditProps {
  item: Item | null;
  mode: ModalMode;
  isOpen: boolean;
  onClose: () => void;
}

enum Tabs {
  Batch = 'Batch',
  Pricing = 'Pricing',
  Location = 'Location',
}

export type DraftInboundLine = Pick<
  InvoiceLine,
  | 'id'
  | 'batch'
  | 'costPricePerPack'
  | 'sellPricePerPack'
  | 'expiryDate'
  | 'location'
  | 'numberOfPacks'
  | 'packSize'
  | 'itemId'
  | 'invoiceId'
> & {
  isCreated?: boolean;
  isUpdated?: boolean;
};

const createDraftInvoiceLine = (
  itemId: string,
  invoiceId: string,
  seed?: InvoiceLine
): DraftInboundLine => {
  const draftLine: DraftInboundLine = {
    id: generateUUID(),
    itemId,
    invoiceId,
    sellPricePerPack: 0,
    costPricePerPack: 0,
    numberOfPacks: 0,
    packSize: 0,
    isCreated: seed ? false : true,
    location: undefined,
    ...seed,
  };

  return draftLine;
};
const useDraftInboundLines = (itemId: string) => {
  const lines = useInboundLines(itemId);
  const { id } = useInboundFields('id');
  const { mutateAsync, isLoading } = useSaveInboundLines();
  const [draftLines, setDraftLines] = React.useState<DraftInboundLine[]>([]);

  React.useEffect(() => {
    if (lines && itemId) {
      const drafts = lines.map(line =>
        createDraftInvoiceLine(line.itemId, line.invoiceId, line)
      );
      if (drafts.length === 0) drafts.push(createDraftInvoiceLine(itemId, id));
      setDraftLines(drafts);
    } else {
      setDraftLines([]);
    }
  }, [lines, itemId]);

  const addDraftLine = () => {
    const newLine = createDraftInvoiceLine(itemId, id);
    setDraftLines([...draftLines, newLine]);
  };

  const updateDraftLine = React.useCallback(
    (patch: Partial<DraftInboundLine> & { id: string }) => {
      const batch = draftLines.find(line => line.id === patch.id);

      if (batch) {
        const newBatch = { ...batch, ...patch, isUpdated: true };
        const index = draftLines.indexOf(batch);
        draftLines[index] = newBatch;
        setDraftLines([...draftLines]);
      }
    },
    [draftLines, setDraftLines]
  );

  const saveLines = async () => {
    await mutateAsync(draftLines);
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
}) => {
  const t = useTranslation('distribution');
  const { error } = useNotification();
  const [currentItem, setCurrentItem] = useState<Item | null>(item);
  const nextItem = useNextItem(currentItem?.id ?? '');
  const isMediumScreen = useIsMediumScreen();
  const [currentTab, setCurrentTab] = useState<Tabs>(Tabs.Batch);
  const { Modal } = useDialog({ isOpen, onClose });

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  const { draftLines, addDraftLine, updateDraftLine, isLoading, saveLines } =
    useDraftInboundLines(currentItem?.id ?? '');

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
              await saveLines();
              setCurrentItem(mode === ModalMode.Update ? nextItem : null);
              return true;
            } catch (e) {
              return false;
            }
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
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
      height={600}
      width={1024}
    >
      {isLoading ? (
        <BasicSpinner />
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
                    <Tab value={Tabs.Location} label={Tabs.Location} />
                  </TabList>
                </Box>
                <Box flex={1} justifyContent="flex-end" display="flex">
                  <ButtonWithIcon
                    color="primary"
                    variant="outlined"
                    onClick={addDraftLine}
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
                <InboundLineEditPanel
                  value={Tabs.Batch}
                  lines={draftLines}
                  updateDraftLine={updateDraftLine}
                >
                  <QuantityTable
                    lines={draftLines}
                    updateDraftLine={updateDraftLine}
                  />
                </InboundLineEditPanel>

                <InboundLineEditPanel
                  value={Tabs.Pricing}
                  lines={draftLines}
                  updateDraftLine={updateDraftLine}
                >
                  <PricingTable
                    lines={draftLines}
                    updateDraftLine={updateDraftLine}
                  />
                </InboundLineEditPanel>

                <InboundLineEditPanel
                  value={Tabs.Location}
                  lines={draftLines}
                  updateDraftLine={updateDraftLine}
                >
                  <LocationTable
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
  );
};
