import React, { FC, useState } from 'react';
import {
  ItemRowFragment,
  LocationRowFragment,
} from '@openmsupply-client/system';
import {
  BasicSpinner,
  Divider,
  useIsMediumScreen,
  Box,
  ModalMode,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  QueryParamsProvider,
  useRowStyle,
  useNotification,
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
  const [currentItem, setCurrentItem] = useState(item);
  const isMediumScreen = useIsMediumScreen();
  const { draftLines, update, addLine, isLoading, save, nextItem } =
    useStocktakeLineEdit(currentItem);
  const { setRowStyles } = useRowStyle();
  const { error } = useNotification();

  const onNext = async () => {
    let { errorMessages } = await save();
    if (errorMessages)
      return errorMessages.forEach(errorMessage => error(errorMessage)());

    if (mode === ModalMode.Update && nextItem) setCurrentItem(nextItem);
    else if (mode === ModalMode.Create) setCurrentItem(null);
    else onClose();
    // Returning true here triggers the slide animation
    return true;
  };

  const onOk = async () => {
    let { errorMessages } = await save();
    if (errorMessages)
      return errorMessages.forEach(errorMessage => error(errorMessage)());

    if (item) {
      setRowStyles(
        draftLines.map(line => line.id),
        {
          animation: 'highlight 1.5s',
        }
      );
    }
    onClose();
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
                        />
                      </StyledTabContainer>
                    </StyledTabPanel>

                    <StyledTabPanel value={Tabs.Pricing}>
                      <StyledTabContainer>
                        <PricingTable
                          isDisabled={isDisabled}
                          batches={draftLines}
                          update={update}
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
