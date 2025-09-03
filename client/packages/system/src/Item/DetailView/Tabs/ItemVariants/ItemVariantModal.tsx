import React from 'react';

import {
  DialogButton,
  useTranslation,
  useDialog,
  useNotification,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  ItemVariantFragment,
  useItemVariant,
} from '../../../api';
import { ItemVariantForm } from './ItemVariantForm';

export const ItemVariantModal = ({
  item,
  variant,
  onClose,
}: {
  item: ItemRowFragment;
  variant: ItemVariantFragment | null;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen: true, onClose, disableBackdrop: true });
  const { success, error } = useNotification();
  const isVaccine = item?.isVaccine;

  const { draft, isComplete, updateDraft, updatePackagingVariant, save } =
    useItemVariant({
      item,
      variant,
    });

  return (
    <Modal
      title={variant ? t('label.edit-variant') : t('label.add-variant')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          disabled={!isComplete}
          variant="ok"
          onClick={() => {
            save(draft)
              .then(() => {
                success(t('messages.item-variant-saved'))();
                onClose();
              })
              .catch(e => {
                // We create the same error message as we get from the default handler, but prevent duplicates
                // This avoids the same error message being displayed multiple times, and the only appears once bug...
                // https://github.com/msupply-foundation/open-msupply/issues/3984
                if (
                  e instanceof Error &&
                  e.message.includes(t('error.duplicate-item-variant-name'))
                ) {
                  error(t('error.duplicate-item-variant-name'), {
                    preventDuplicate: true,
                  })();
                  return;
                }
                error(t('error.failed-to-save-item-variant'))();
              });
          }}
        />
      }
      height={500}
      width={1000}
      slideAnimation={false}
    >
      <ItemVariantForm
        updateVariant={updateDraft}
        updatePackagingVariant={updatePackagingVariant}
        variant={draft}
        isVaccine={isVaccine}
      />
    </Modal>
  );
};
