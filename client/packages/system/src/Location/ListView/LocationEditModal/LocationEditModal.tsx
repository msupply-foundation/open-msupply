import React, { FC, useState } from 'react';
import {
  ModalMode,
  useDialog,
  BasicTextInput,
  Grid,
  DialogButton,
  useTranslation,
  FnUtils,
  ToggleButton,
  InlineSpinner,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocation } from '../../api';
interface LocationEditModalProps {
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;

  location: LocationRowFragment | null;
}

const createNewLocation = (
  seed?: LocationRowFragment | null
): LocationRowFragment => ({
  __typename: 'LocationNode',
  id: FnUtils.generateUUID(),
  name: '',
  code: '',
  onHold: false,
  ...seed,
});

interface UseDraftLocationControl {
  draft: LocationRowFragment;
  onUpdate: (patch: Partial<LocationRowFragment>) => void;
  onChangeLocation: () => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftLocation = (
  seed: LocationRowFragment | null,
  mode: ModalMode | null
): UseDraftLocationControl => {
  const [location, setLocation] = useState<LocationRowFragment>(() =>
    createNewLocation(seed)
  );
  const nextLocation = useLocation.document.next(location);
  const { mutate: insert, isLoading: insertIsLoading } =
    useLocation.document.insert();
  const { mutate: update, isLoading: updateIsLoading } =
    useLocation.document.update();

  const onUpdate = (patch: Partial<LocationRowFragment>) => {
    setLocation({ ...location, ...patch });
  };

  const onSave = async () => {
    if (mode === ModalMode.Create) {
      return insert(location);
    } else {
      return update(location);
    }
  };

  const onChangeLocation = () => {
    if (mode === ModalMode.Create) {
      setLocation(createNewLocation());
    } else {
      setLocation(createNewLocation(nextLocation));
    }
  };

  return {
    draft: location,
    onUpdate,
    onChangeLocation,
    onSave,
    isLoading: updateIsLoading || insertIsLoading,
  };
};

export const LocationEditModal: FC<LocationEditModalProps> = ({
  mode,
  isOpen,
  onClose,
  location,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('inventory');
  const { draft, onUpdate, onChangeLocation, onSave, isLoading } =
    useDraftLocation(location, mode);
  const isInvalid = !draft.code || !draft.name;

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
      nextButton={
        <DialogButton
          variant="next"
          disabled={isInvalid}
          onClick={async () => {
            await onSave();
            onChangeLocation();
            return true;
          }}
        />
      }
      title={
        mode === ModalMode.Create
          ? t('label.create-location')
          : t('label.edit-location')
      }
    >
      {!isLoading ? (
        <Grid flexDirection="column" display="flex" gap={2}>
          <BasicTextInput
            fullWidth
            autoFocus
            value={draft.name}
            onChange={e => onUpdate({ name: e.target.value })}
            label={t('label.name')}
            InputLabelProps={{ shrink: true }}
          />
          <BasicTextInput
            fullWidth
            value={draft.code}
            onChange={e => onUpdate({ code: e.target.value })}
            label={t('label.code')}
            InputLabelProps={{ shrink: true }}
          />
          <Grid alignSelf="center">
            <ToggleButton
              label="On hold"
              value={draft.onHold}
              selected={draft.onHold}
              onClick={(_, val) => {
                onUpdate({ onHold: !val });
              }}
            />
          </Grid>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
