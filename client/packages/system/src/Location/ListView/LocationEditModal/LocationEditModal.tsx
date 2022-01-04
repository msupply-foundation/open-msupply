import React, { FC, useState } from 'react';
import {
  ModalMode,
  useDialog,
  BasicTextInput,
  Grid,
  DialogButton,
  useTranslation,
  generateUUID,
  ToggleButton,
  InlineSpinner,
} from '@openmsupply-client/common';
import { Location } from '../../types';
import { useLocationInsert, useNextLocation, useLocationUpdate } from '../api';
interface LocationEditModalProps {
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;

  location: Location | null;
}

const createNewLocation = (seed?: Location | null) => ({
  id: generateUUID(),
  name: '',
  code: '',
  onHold: false,
  ...seed,
});

interface UseDraftLocationControl {
  draft: Location;
  onUpdate: (patch: Partial<Location>) => void;
  onChangeLocation: () => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftLocation = (
  seed: Location | null,
  mode: ModalMode | null
): UseDraftLocationControl => {
  const [location, setLocation] = useState<Location>(() =>
    createNewLocation(seed)
  );
  const nextLocation = useNextLocation(location);
  const { mutate: insert, isLoading: insertIsLoading } = useLocationInsert();
  const { mutate: update, isLoading: updateIsLoading } = useLocationUpdate();

  const onUpdate = (patch: Partial<Location>) => {
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
  const t = useTranslation(['inventory', 'common']);
  const { draft, onUpdate, onChangeLocation, onSave, isLoading } =
    useDraftLocation(location, mode);

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
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
            value={draft.name}
            onChange={e => onUpdate({ name: e.target.value })}
            label={t('label.name')}
            InputLabelProps={{ shrink: true }}
          />
          <BasicTextInput
            value={draft.code}
            onChange={e => onUpdate({ code: e.target.value })}
            label={t('label.code')}
            InputLabelProps={{ shrink: true }}
          />
          <ToggleButton
            label="On hold"
            value={draft.onHold}
            selected={draft.onHold}
            onClick={(_, val) => {
              console.log(val);
              onUpdate({ onHold: !val });
            }}
          />
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
