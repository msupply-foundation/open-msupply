import React, { useCallback, useEffect, useState } from 'react';
import {
  useTranslation,
  Grid,
  DialogButton,
  useDialog,
  ModalRow,
  ModalLabel,
  Divider,
  useNotification,
  useNavigate,
  RouteBuilder,
  usePluginEvents,
  noOtherVariants,
} from '@openmsupply-client/common';
import { useStockLine } from '../api';
import { StockLineForm } from './StockLineForm';
import { StockItemSearchInput } from '../..';
import { AppRoute } from '@openmsupply-client/config';
import {
  getVolumePerPackFromVariant,
  ItemVariantFragment,
  ItemVariantSelectPanel,
  useIsItemVariantsEnabled,
  useItemVariants,
} from '../../Item';

interface NewStockLineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewStockLineModal = ({
  isOpen,
  onClose,
}: NewStockLineModalProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const pluginEvents = usePluginEvents({
    isDirty: false,
  });

  const { Modal } = useDialog({
    isOpen,
    onClose,
    disableMobileFullScreen: true,
  });

  const {
    query: { isLoading },
    draft,
    updatePatch,
    create: { create },
  } = useStockLine();

  const [variantPanelOpen, setVariantPanelOpen] = useState(false);
  const itemVariantsEnabled = useIsItemVariantsEnabled();
  const { data: variantData } = useItemVariants(draft.itemId ?? '');
  const hasVariants =
    itemVariantsEnabled && (variantData?.variants?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasVariants || !draft.itemId) return;
    setVariantPanelOpen(true);
  }, [hasVariants, draft.itemId]);

  const isDisabled =
    !draft.itemId || !draft.packSize || !draft.totalNumberOfPacks;

  const mapStructuredErrors = (result: Awaited<ReturnType<typeof create>>) => {
    if (result.insertStockLine.__typename === 'StockLineNode') {
      return;
    }
    const { error } = result.insertStockLine;
    switch (error.__typename) {
      case 'AdjustmentReasonNotProvided':
        return t('error.provide-reason-new-stock');
      default:
        return noOtherVariants(error.__typename);
    }
  };

  const save = async () => {
    try {
      const result = await create();

      if (result?.insertStockLine.__typename === 'InsertStockLineError') {
        const errorMessage = mapStructuredErrors(result);
        if (errorMessage) {
          error(errorMessage)();
        }
      }

      if (result?.insertStockLine.__typename === 'StockLineNode') {
        const successSnack = success(t('messages.stock-line-saved'));
        successSnack();
        onClose();
        navigate(
          RouteBuilder.create(AppRoute.Inventory)
            .addPart(AppRoute.Stock)
            .addPart(result?.insertStockLine.id)
            .build()
        );
      }

      updatePatch(draft);
    } catch {
      error(t('messages.could-not-save'))(); // generic could not save message
    }
  };

  const onVariantSelected = useCallback(
    (variant: ItemVariantFragment) => {
      updatePatch({
        itemVariant: variant,
        manufacturer: variant.manufacturer ?? null,
        volumePerPack:
          getVolumePerPackFromVariant({
            packSize: draft.packSize,
            itemVariant: variant,
          }) ?? 0,
      });
      setVariantPanelOpen(false);
    },
    [updatePatch, draft.packSize]
  );

  return (
    <Modal
      width={700}
      height={575}
      slideAnimation={false}
      title={t('title.stock-line-details')}
      okButton={
        <DialogButton variant="ok" disabled={isDisabled} onClick={save} />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Grid
        container
        paddingBottom={4}
        alignItems="center"
        flexDirection="column"
        gap={1}
      >
        <ModalRow>
          <ModalLabel
            label={t('label.item', { count: 1 })}
            justifyContent="flex-end"
          />
          <Grid flex={1}>
            <StockItemSearchInput
              autoFocus={!draft.itemId}
              openOnFocus={!draft.itemId}
              disabled={!!draft.itemId}
              currentItemId={draft.itemId}
              onChange={newItem => {
                if (!newItem) return;
                updatePatch({
                  itemId: newItem.id,
                  item: {
                    ...newItem,
                    doses: newItem.doses,
                  },
                  packSize: newItem.defaultPackSize,
                  sellPricePerPack:
                    newItem.itemStoreProperties?.defaultSellPricePerPack ?? 0,
                });
              }}
            />
          </Grid>
        </ModalRow>
        <Divider />

        {draft.itemId && (
          <Grid width={'100%'}>
            <StockLineForm
              draft={draft}
              loading={isLoading}
              onUpdate={updatePatch}
              packEditable
              isNewModal
              pluginEvents={pluginEvents}
            />
          </Grid>
        )}

        {draft.itemId && (
          <ItemVariantSelectPanel
            itemId={draft.itemId}
            open={variantPanelOpen}
            onClose={() => setVariantPanelOpen(false)}
            onSelect={onVariantSelected}
          />
        )}
      </Grid>
    </Modal>
  );
};
