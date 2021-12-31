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
} from '@openmsupply-client/common';
import { Location } from '../../types';

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

const useDraftLocation = (
  seed: Location | null
): [Location, (patch: Partial<Location>) => void] => {
  const [location, setLocation] = useState<Location>(() =>
    createNewLocation(seed)
  );

  const onUpdate = (patch: Partial<Location>) => {
    setLocation({ ...location, ...patch });
  };

  return [location, onUpdate];
};

export const LocationEditModal: FC<LocationEditModalProps> = ({
  mode,
  isOpen,
  onClose,
  location,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation(['inventory', 'common']);
  const [draft, onUpdate] = useDraftLocation(location);

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            // await save();
            onClose();
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          variant="next"
          onClick={async () => {
            // await save()
            // getNext
            onClose();
          }}
        />
      }
      title={
        mode === ModalMode.Create
          ? t('label.create-location')
          : t('label.edit-location')
      }
    >
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
    </Modal>
  );
};
