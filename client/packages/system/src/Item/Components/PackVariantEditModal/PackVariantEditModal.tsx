import React, { FC, useState } from 'react';
import {
  ModalMode,
  useDialog,
  BasicTextInput,
  Grid,
  DialogButton,
  useTranslation,
  FnUtils,
  InlineSpinner,
  NumericTextInput,
  useNotification,
  noOtherVariants,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { VariantFragment } from '../../api';
import { usePackVariantInsert } from '../../api/hooks/usePackVariantInsert';
import { usePackVariantUpdate } from '../../api/hooks/usePackVariantUpdate';
import { usePackVariantDelete } from '../../api/hooks/usePackVariantDelete';

interface PackVariantEditModalProps {
  itemId: string;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  packVariant: VariantFragment | null;
}

const createNewPackVariant = (itemId: string): VariantFragment => ({
  __typename: 'VariantNode',
  id: FnUtils.generateUUID(),
  itemId,
  shortName: '',
  longName: '',
  packSize: 0,
});

interface UseDraftPackVariantControl {
  draft: VariantFragment;
  onUpdate: (patch: Partial<VariantFragment>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftPackVariant = (
  itemId: string,
  seed: VariantFragment | null,
  mode: ModalMode | null
): UseDraftPackVariantControl => {
  const [packVariant, setPackVariant] = useState<VariantFragment>(
    () => seed || createNewPackVariant(itemId)
  );
  const t = useTranslation('catalogue');
  const { error } = useNotification();
  const { mutateAsync: insert, isLoading: insertIsLoading } =
    usePackVariantInsert();
  const { mutateAsync: update, isLoading: updateIsLoading } =
    usePackVariantUpdate();

  const onUpdate = (patch: Partial<VariantFragment>) => {
    setPackVariant({ ...packVariant, ...patch });
  };

  const onSave = async () => {
    const result =
      mode === ModalMode.Create
        ? await insert(packVariant)
        : await update(packVariant);

    if (result.__typename === 'VariantNode') return;
    const structuredError = result.error;

    switch (structuredError.__typename) {
      case 'VariantWithPackSizeAlreadyExists':
        error(t('error.pack-variant-exists'))();
        throw Error();
      case 'CannotAddPackSizeOfZero':
        error(t('error.cannot-add-pack-size-of-zero'))();
        throw Error();
      case 'CannotAddWithNoAbbreviationAndName':
        error(t('error.cannot-add-with-no-abbreviation-and-name'))();
        throw Error();
      default:
        noOtherVariants(structuredError);
    }
  };

  return {
    draft: packVariant,
    onUpdate,
    onSave,
    isLoading: insertIsLoading || updateIsLoading,
  };
};

export const PackVariantEditModal: FC<PackVariantEditModalProps> = ({
  itemId,
  mode,
  isOpen,
  onClose,
  packVariant,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('catalogue');
  const { mutateAsync } = usePackVariantDelete();
  const { draft, onUpdate, onSave, isLoading } = useDraftPackVariant(
    itemId,
    packVariant,
    mode
  );

  const onDelete = async () => {
    await mutateAsync(draft);
    onClose();
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-pack-variant', {
      packVariantName: draft.longName,
    }),
    onConfirm: onDelete,
  });

  return (
    <Modal
      width={450}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              await onSave();
              onClose();
            } catch (_) {
              // Already handled and displayed in onSave
              // caught to make sure modal is not closed on error
            }
          }}
        />
      }
      deleteButton={
        mode === ModalMode.Update ? (
          <DialogButton
            variant="delete"
            color="primary"
            onClick={() => getConfirmation()}
          />
        ) : undefined
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      title={
        mode === ModalMode.Create
          ? t('label.create-pack-variant')
          : t('label.edit-pack-variant')
      }
    >
      {!isLoading ? (
        <Grid
          flexDirection="column"
          display="flex"
          gap={2}
          justifyContent="center"
        >
          <NumericTextInput
            autoFocus
            allowNegative={false}
            value={draft.packSize}
            onChange={packSize => onUpdate({ packSize: packSize })}
            label={t('label.pack-size')}
            InputLabelProps={{ shrink: true }}
            disabled={mode === ModalMode.Update}
            style={{ justifyContent: 'flex-start' }}
          />
          <BasicTextInput
            fullWidth
            value={draft.shortName}
            onChange={e => onUpdate({ shortName: e.target.value })}
            label={t('label.abbreviation')}
            InputLabelProps={{ shrink: true }}
          />
          <BasicTextInput
            fullWidth
            value={draft.longName}
            onChange={e => onUpdate({ longName: e.target.value })}
            label={t('label.name')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
