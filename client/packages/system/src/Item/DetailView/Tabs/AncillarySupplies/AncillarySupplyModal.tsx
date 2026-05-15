import React, { useState } from 'react';

import { FormLabel } from '@mui/material';
import {
  DialogButton,
  Box,
  useTranslation,
  useDialog,
  QueryParamsProvider,
  createQueryParamsStore,
  useNotification,
  Typography,
  NumericTextInput,
} from '@openmsupply-client/common';
import { StockItemSearchInput } from '@openmsupply-client/system';
import {
  AncillaryItemFragment,
  DraftAncillaryItem,
  ItemFragment,
  useUpsertAncillaryItem,
} from '../../../api';

export const AncillarySupplyModal = ({
  existing,
  item,
  onClose,
}: {
  existing: AncillaryItemFragment | null;
  item: ItemFragment;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });
  const { success, error } = useNotification();

  const { draft, isComplete, updateDraft, resetDraft, save } =
    useUpsertAncillaryItem({
      principalItemId: item.id,
      existing,
    });

  // Bumped after a successful "OK & Next" save so the form (including the
  // StockItemSearchInput's internal search text) re-mounts with a clean slate.
  const [formKey, setFormKey] = useState(0);

  const trySave = async (after: 'close' | 'reset') => {
    try {
      await save();
      success(t('messages.ancillary-item-saved'))();
      if (after === 'close') {
        onClose();
      } else {
        resetDraft();
        setFormKey(k => k + 1);
      }
    } catch (e) {
      if (e instanceof Error && e.message) error(e.message)();
    }
  };

  const isAdd = !existing;

  return (
    <Modal
      title={t('title.ancillary-supply')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          disabled={!isComplete}
          variant="ok"
          onClick={() => trySave('close')}
        />
      }
      nextButton={
        isAdd ? (
          <DialogButton
            disabled={!isComplete}
            variant="next-and-ok"
            onClick={() => trySave('reset')}
          />
        ) : undefined
      }
      height={300}
      width={700}
      slideAnimation={false}
    >
      <QueryParamsProvider
        createStore={createQueryParamsStore({ initialSortBy: { key: 'name' } })}
      >
        <AncillarySupplyForm
          key={formKey}
          draft={draft}
          updateDraft={updateDraft}
          principalItemId={item.id}
          ancillaryItems={item.ancillaryItems}
          isEdit={!!existing}
        />
      </QueryParamsProvider>
    </Modal>
  );
};

const AncillarySupplyForm = ({
  draft,
  principalItemId,
  ancillaryItems,
  updateDraft,
  isEdit,
}: {
  draft: DraftAncillaryItem;
  principalItemId: string;
  ancillaryItems: AncillaryItemFragment[];
  isEdit: boolean;
  updateDraft: (update: Partial<DraftAncillaryItem>) => void;
}) => {
  const t = useTranslation();
  const excludedIds = [
    principalItemId,
    ...ancillaryItems.map(a => a.ancillaryItemId),
  ];

  const labelSx = {
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  };

  return (
    <Box
      display="grid"
      gridTemplateColumns="150px 1fr"
      columnGap={2}
      rowGap={1}
      alignItems="center"
    >
      <FormLabel sx={labelSx}>{t('label.ancillary-item')}:</FormLabel>
      <StockItemSearchInput
        autoFocus={!draft.ancillaryItemId}
        openOnFocus={!draft.ancillaryItemId}
        disabled={isEdit}
        onChange={selected => updateDraft({ ancillaryItemId: selected?.id })}
        currentItemId={draft.ancillaryItemId ?? undefined}
        filter={{ id: { notEqualAll: excludedIds } }}
      />

      <FormLabel sx={labelSx}>{t('label.ratio')}:</FormLabel>
      <Box display="flex" alignItems="center" gap={1}>
        <NumericTextInput
          value={draft.itemQuantity}
          min={0}
          decimalLimit={4}
          onChange={next => updateDraft({ itemQuantity: next ?? 0 })}
          style={{ justifyContent: 'flex-start', width: 120 }}
        />
        <Typography fontWeight="bold">:</Typography>
        <NumericTextInput
          value={draft.ancillaryQuantity}
          min={0}
          decimalLimit={4}
          onChange={next => updateDraft({ ancillaryQuantity: next ?? 0 })}
          style={{ justifyContent: 'flex-start', width: 120 }}
        />
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ gridColumn: 2 }}
      >
        {t('description.ancillary-ratio')}
      </Typography>
    </Box>
  );
};
