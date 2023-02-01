import React, { FC, useState } from 'react';
import {
  ItemRowFragment,
  LocationRowFragment,
} from '@openmsupply-client/system';
import {
  BasicSpinner,
  Divider,
  useTranslation,
  useIsMediumScreen,
  Box,
  ModalMode,
  useNotification,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  QueryParamsProvider,
  useRowStyle,
} from '@openmsupply-client/common';
import { StocktakeLineEditForm } from './StocktakeLineEditForm';
import { useStocktakeLineEdit } from './hooks';
import {
  StocktakeLineEditTabs,
  StyledTabContainer,
  StyledTabPanel,
  Tabs,
} from './StocktakeLineEditTabs';
import { useStocktake } from '../../../api';
import {
  LocationTable,
  BatchTable,
  PricingTable,
} from './StocktakeLineEditTables';
import { StocktakeLineEditModal } from './StocktakeLineEditModal';
interface StocktakeLineEditProps {
  item: ItemRowFragment | null;
  mode: ModalMode | null;
  onClose: () => void;
  isOpen: boolean;
}

export const StocktakeLineEdit: FC<StocktakeLineEditProps> = ({
  item,
  mode,
  onClose,
  isOpen,
}) => {
  const isDisabled = useStocktake.utils.isDisabled();
  const { error } = useNotification();
  const [currentItem, setCurrentItem] = useState(item);
  const isMediumScreen = useIsMediumScreen();
  const t = useTranslation(['inventory']);
  const {
    draftLines,
    update,
    mutableUpdate,
    addLine,
    isLoading,
    save,
    nextItem,
    isError,
  } = useStocktakeLineEdit(currentItem);
  const { setRowStyle } = useRowStyle();

  const onNext = async () => {
    await save(draftLines);
    if (mode === ModalMode.Update && nextItem) setCurrentItem(nextItem);
    else if (mode === ModalMode.Create) setCurrentItem(null);
    else onClose();
    // Returning true here triggers the slide animation
    return true;
  };

  const onOk = async () => {
    try {
      await save(draftLines);
      if (item) {
        const highlight = {
          animation: 'highlight 1.5s',
        };
        const rowIds = draftLines.map(line => line.id);
        rowIds.forEach(id => setRowStyle(id, highlight));
      }
      onClose();
    } catch (e) {
      const msg =
        `${e}`.indexOf('AdjustmentReasonNotProvided') !== -1
          ? t('error.provide-reason')
          : t('error.cant-save');
      error(msg)();
    }
  };

  const hasValidBatches = draftLines.length > 0;

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <StocktakeLineEditModal
        onNext={onNext}
        onOk={onOk}
        onCancel={onClose}
        mode={mode}
        isOpen={isOpen}
        hasNext={!!nextItem}
        isValid={hasValidBatches}
      >
        {(() => {
          if (isLoading) {
            return (
              <Box sx={{ height: isMediumScreen ? 350 : 450 }}>
                <BasicSpinner messageKey="saving" />
              </Box>
            );
          }

          return (
            <>
              <StocktakeLineEditForm
                item={currentItem}
                onChangeItem={setCurrentItem}
                mode={mode}
              />
              {!currentItem ? (
                <Box sx={{ height: isMediumScreen ? 400 : 500 }} />
              ) : null}
              {!!currentItem ? (
                <>
                  <Divider margin={5} />
                  <StocktakeLineEditTabs
                    isDisabled={isDisabled}
                    onAddLine={addLine}
                  >
                    <StyledTabPanel value={Tabs.Batch}>
                      <StyledTabContainer>
                        <BatchTable
                          isDisabled={isDisabled}
                          batches={draftLines}
                          update={update}
                          mutableUpdate={mutableUpdate}
                          isError={isError}
                        />
                      </StyledTabContainer>
                    </StyledTabPanel>

                    <StyledTabPanel value={Tabs.Pricing}>
                      <StyledTabContainer>
                        <PricingTable
                          isDisabled={isDisabled}
                          batches={draftLines}
                          update={update}
                          mutableUpdate={mutableUpdate}
                        />
                      </StyledTabContainer>
                    </StyledTabPanel>

                    <StyledTabPanel value={Tabs.Location}>
                      <StyledTabContainer>
                        <QueryParamsProvider
                          createStore={() =>
                            createQueryParamsStore<LocationRowFragment>({
                              initialSortBy: { key: 'name' },
                            })
                          }
                        >
                          <LocationTable
                            isDisabled={isDisabled}
                            batches={draftLines}
                            update={update}
                            mutableUpdate={mutableUpdate}
                          />
                        </QueryParamsProvider>
                      </StyledTabContainer>
                    </StyledTabPanel>
                  </StocktakeLineEditTabs>
                </>
              ) : null}
            </>
          );
        })()}
      </StocktakeLineEditModal>
    </TableProvider>
  );
};
