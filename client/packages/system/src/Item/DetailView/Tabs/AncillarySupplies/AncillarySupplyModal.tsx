import React from 'react';

import { FormLabel } from '@mui/material';
import {
  DialogButton,
  InputWithLabelRow,
  Box,
  useTranslation,
  useDialog,
  QueryParamsProvider,
  createQueryParamsStore,
  useNotification,
  Typography,
  NumericTextInput,
  InfoTooltipIcon,
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

  const { draft, isComplete, updateDraft, save } = useUpsertAncillaryItem({
    principalItemId: item.id,
    existing,
  });

  return (
    <Modal
      title={t('title.ancillary-supply')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          disabled={!isComplete}
          variant="ok"
          onClick={async () => {
            try {
              await save();
              success(t('messages.ancillary-item-saved'))();
              onClose();
            } catch (e) {
              error(
                e instanceof Error
                  ? e.message
                  : t('error.failed-to-save-ancillary-item')
              )();
            }
          }}
        />
      }
      height={300}
      width={700}
      slideAnimation={false}
    >
      <QueryParamsProvider
        createStore={createQueryParamsStore({ initialSortBy: { key: 'name' } })}
      >
        <AncillarySupplyForm
          draft={draft}
          updateDraft={updateDraft}
          principalItemId={item.id}
          isEdit={!!existing}
        />
      </QueryParamsProvider>
    </Modal>
  );
};

const AncillarySupplyForm = ({
  draft,
  principalItemId,
  updateDraft,
  isEdit,
}: {
  draft: DraftAncillaryItem;
  principalItemId: string;
  isEdit: boolean;
  updateDraft: (update: Partial<DraftAncillaryItem>) => void;
}) => {
  const t = useTranslation();

  return (
    <Box justifyContent="center" display="flex" gap={3}>
      <Box display="flex" flexDirection="column" gap={1} flex={1}>
        <InputWithLabelRow
          label={t('label.ancillary-item')}
          labelWidth="200"
          Input={
            <Box width="100%">
              <StockItemSearchInput
                autoFocus={!draft.ancillaryItemId}
                openOnFocus={!draft.ancillaryItemId}
                disabled={isEdit}
                onChange={selected =>
                  updateDraft({ ancillaryItemId: selected?.id })
                }
                currentItemId={draft.ancillaryItemId ?? undefined}
                filter={{ id: { notEqualAll: [principalItemId] } }}
              />
            </Box>
          }
        />

        <Box display="flex" alignItems="center" gap={1}>
          <FormLabel
            sx={{
              width: '200px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {t('label.ratio')}
            <InfoTooltipIcon title={t('description.ancillary-ratio')} />
            :
          </FormLabel>
          <NumericTextInput
            value={draft.itemQuantity}
            min={0}
            decimalLimit={4}
            onChange={next =>
              updateDraft({ itemQuantity: next ?? 0 })
            }
            style={{ justifyContent: 'flex-start', width: 120 }}
          />
          <Typography fontWeight="bold">:</Typography>
          <NumericTextInput
            value={draft.ancillaryQuantity}
            min={0}
            decimalLimit={4}
            onChange={next =>
              updateDraft({ ancillaryQuantity: next ?? 0 })
            }
            style={{ justifyContent: 'flex-start', width: 120 }}
          />
        </Box>
      </Box>
    </Box>
  );
};
