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
  NonNegativeIntegerInput,
} from '@openmsupply-client/common';
import { VariantFragment } from '../../api';
import { usePackVariantInsert } from '../../api/hooks/usePackVariantInsert';
import { usePackVariantUpdate } from '../../api/hooks/usePackVariantUpdate';

interface PackVariantEditModalProps {
  itemId: string;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
  packVariant: VariantFragment | null;
}

const createNewPackVariant = (
  itemId: string,
  seed?: VariantFragment | null
): VariantFragment => ({
  __typename: 'VariantNode',
  id: FnUtils.generateUUID(),
  itemId,
  shortName: '',
  longName: '',
  packSize: 0,
  ...seed,
});

interface UseDraftPackVariantControl {
  draft: VariantFragment;
  onUpdate: (patch: Partial<VariantFragment>) => void;
  onChangePackVariant: () => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftPackVariant = (
  itemId: string,
  seed: VariantFragment | null,
  mode: ModalMode | null
): UseDraftPackVariantControl => {
  const [packVariant, setPackVariant] = useState<VariantFragment>(() =>
    createNewPackVariant(itemId, seed)
  );

  const { mutate: insert, isLoading: insertIsLoading } = usePackVariantInsert();
  const { mutate: update, isLoading: updateIsLoading } = usePackVariantUpdate();

  const onUpdate = (patch: Partial<VariantFragment>) => {
    setPackVariant({ ...packVariant, ...patch });
  };

  const onSave = async () => {
    if (mode === ModalMode.Create) {
      return insert(packVariant);
    } else {
      return update(packVariant);
    }
  };

  const onChangePackVariant = () => {
    if (mode === ModalMode.Create) {
      setPackVariant(createNewPackVariant(itemId));
    }
  };

  return {
    draft: packVariant,
    onUpdate,
    onChangePackVariant,
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
  const { draft, onUpdate, onSave, isLoading } = useDraftPackVariant(
    itemId,
    packVariant,
    mode
  );
  const isInvalid = !draft.packSize && !draft.itemId;

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={isInvalid}
          onClick={async () => {
            await onSave();
            onClose();
          }}
        />
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
          <NonNegativeIntegerInput
            width={500}
            autoFocus
            value={draft.packSize}
            onChange={packSize => onUpdate({ packSize: packSize })}
            label={t('label.pack-size')}
            InputLabelProps={{ shrink: true }}
            disabled={mode === ModalMode.Update}
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
