import React, { useEffect, useState } from 'react';
import { checkInvalidLocationLines } from '@openmsupply-client/system';
import {
  BasicSpinner,
  Breakpoints,
  Divider,
  Box,
  ModalMode,
  useAppTheme,
  useMediaQuery,
  useNotification,
  useUrlQueryParams,
  useSimplifiedTabletUI,
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { StocktakeLineEditForm } from './StocktakeLineEditForm';
import { useStocktakeLineEdit } from './hooks';
import {
  StocktakeLineEditTabs,
  StyledTabContainer,
  StyledTabPanel,
  Tabs,
} from './StocktakeLineEditTabs';
import { StocktakeLineFragment, useStocktakeOld } from '../../../api';
import {
  LocationTable,
  BatchTable,
  PricingTable,
} from './StocktakeLineEditTables';
import { StocktakeLineEditModal } from './StocktakeLineEditModal';
interface StocktakeLineEditProps {
  item: StocktakeLineFragment['item'] | null;
  mode: ModalMode | null;
  onClose: () => void;
  isOpen: boolean;
  isInitialStocktake: boolean;
}

export const StocktakeLineEdit = ({
  item,
  mode,
  onClose,
  isOpen,
  isInitialStocktake,
}: StocktakeLineEditProps) => {
  const theme = useAppTheme();
  const isMediumScreen = useMediaQuery(theme.breakpoints.down(Breakpoints.lg));
  const [currentItem, setCurrentItem] = useState(item);

  const { isDisabled, items, totalLineCount, lines } =
    useStocktakeOld.line.rows();
  const { draftLines, update, addLine, isSaving, save, nextItem } =
    useStocktakeLineEdit(currentItem, items, lines);
  const t = useTranslation();
  const { error } = useNotification();
  const {
    updatePaginationQuery,
    queryParams: { first, offset, page },
  } = useUrlQueryParams();
  const hasMorePages = totalLineCount > Number(first) + Number(offset);
  // Order by newly added batch since new batches are now
  // added to the top of the stocktake list instead of the bottom
  const reversedDraftLines = [...draftLines].reverse();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const restrictedLocationTypeId =
    currentItem?.restrictedLocationTypeId ?? null;

  const hasInvalidLocationLines = !!currentItem
    ? checkInvalidLocationLines(restrictedLocationTypeId, draftLines)
    : null;

  const onNext = async () => {
    if (isSaving) return;
    const { errorMessages } = await save();
    if (errorMessages) {
      errorMessages.forEach(errorMessage =>
        error(errorMessage, { autoHideDuration: 10000 })()
      );
      return;
    }

    switch (true) {
      case mode === ModalMode.Update && !!nextItem:
        setCurrentItem(nextItem);
        break;
      case mode === ModalMode.Update && hasMorePages:
        // we are at the end of the current paginated set of items
        // fetch more pages and set the current item to null
        // so that we can correctly set the current item when the
        // lines query returns
        updatePaginationQuery(page + 1);
        setCurrentItem(null);
        break;
      case mode === ModalMode.Create:
        setCurrentItem(null);
        break;
      default:
        onClose();
        break;
    }

    // Returning true here triggers the slide animation
    return true;
  };

  const onOk = async () => {
    if (isSaving) return;
    const { errorMessages } = await save();
    if (errorMessages) {
      errorMessages.forEach(errorMessage => error(errorMessage)());
      return;
    }

    onClose();
  };

  const hasValidBatches = draftLines.length > 0;

  useEffect(() => {
    // if the pagination has been increased and items have been fetched
    // and we are updating and the current item has been nulled
    // then it is time to set the curren item again
    if (mode === ModalMode.Update && !currentItem && !!items[0]?.item)
      setCurrentItem(items[0]?.item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const tableContent = simplifiedTabletView ? (
    <>
      <BatchTable
        disabled={isDisabled}
        batches={reversedDraftLines}
        update={update}
        isInitialStocktake={isInitialStocktake}
        isVaccineItem={currentItem?.isVaccine ?? false}
      />
      <Box flex={1} justifyContent="flex-start" display="flex" margin={3}>
        <ButtonWithIcon
          disabled={isDisabled}
          color="primary"
          variant="outlined"
          onClick={addLine}
          label={`${t('label.add-batch')} (+)`}
          Icon={<PlusCircleIcon />}
        />
      </Box>
    </>
  ) : (
    <>
      <StocktakeLineEditTabs isDisabled={isDisabled} onAddLine={addLine}>
        <StyledTabPanel value={Tabs.Batch}>
          <StyledTabContainer>
            <BatchTable
              disabled={isDisabled}
              batches={reversedDraftLines}
              update={update}
              isInitialStocktake={isInitialStocktake}
              isVaccineItem={currentItem?.isVaccine ?? false}
            />
          </StyledTabContainer>
        </StyledTabPanel>

        <StyledTabPanel value={Tabs.Pricing}>
          <StyledTabContainer>
            <PricingTable
              disabled={isDisabled}
              batches={reversedDraftLines}
              update={update}
            />
          </StyledTabContainer>
        </StyledTabPanel>

        <StyledTabPanel value={Tabs.Other}>
          <StyledTabContainer>
            <LocationTable
              disabled={isDisabled}
              batches={reversedDraftLines}
              update={update}
              restrictedToLocationTypeId={
                currentItem?.restrictedLocationTypeId ?? null
              }
            />
          </StyledTabContainer>
        </StyledTabPanel>
      </StocktakeLineEditTabs>
    </>
  );

  return (
    <StocktakeLineEditModal
      onNext={onNext}
      onOk={onOk}
      onCancel={onClose}
      mode={mode}
      isOpen={isOpen}
      hasNext={!!nextItem || hasMorePages}
      isValid={hasValidBatches && !isSaving}
    >
      {(() => {
        if (isSaving) {
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
              items={items}
              onChangeItem={setCurrentItem}
              mode={mode}
              hasInvalidLocationLines={hasInvalidLocationLines ?? false}
            />
            {!currentItem ? (
              <Box sx={{ height: isMediumScreen ? 400 : 500 }} />
            ) : null}
            {!!currentItem ? (
              <>
                <Divider margin={5} />
                {tableContent}
              </>
            ) : null}
          </>
        );
      })()}
    </StocktakeLineEditModal>
  );
};
