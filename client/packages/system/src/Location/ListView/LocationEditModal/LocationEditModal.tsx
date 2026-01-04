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
  NumericTextInput,
  Box,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocationList, useLocation } from '../../api';
import { LocationTypeInput } from '@openmsupply-client/system';
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
  volume: 0,
  volumeUsed: 0,
  stock: { __typename: 'StockLineConnector', totalCount: 0 },
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
  const { nextLocation } = useLocationList(
    {
      sortBy: { key: 'name', direction: 'asc' },
    },
    location
  );
  const {
    create: { create, isCreating },
    update: { update, isUpdating },
  } = useLocation();

  const onUpdate = (patch: Partial<LocationRowFragment>) => {
    setLocation({ ...location, ...patch });
  };

  const onSave = async () => {
    if (mode === ModalMode.Create) {
      return create(location);
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
    isLoading: isUpdating || isCreating,
  };
};

export const LocationEditModal: FC<LocationEditModalProps> = ({
  mode,
  isOpen,
  onClose,
  location,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation();
  const { draft, onUpdate, onChangeLocation, onSave, isLoading } =
    useDraftLocation(location, mode);
  const isInvalid = !draft.code.trim() || !draft.name.trim();

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
          variant="next-and-ok"
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
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <BasicTextInput
            fullWidth
            value={draft.code}
            onChange={e => onUpdate({ code: e.target.value })}
            label={t('label.code')}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <LocationTypeInput
            value={draft.locationType ?? null}
            label={t('label.location-type')}
            onChange={locationType => onUpdate({ locationType })}
          />
          <Box
            sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}
          >
            <NumericTextInput
              value={draft.volume ?? 0}
              onChange={volume => onUpdate({ volume })}
              label={t('label.volume')}
              fullWidth
              decimalLimit={10}
            />
            <NumericTextInput
              value={draft.volumeUsed}
              label={t('label.volume-used')}
              disabled
              fullWidth
              decimalLimit={10}
            />
          </Box>
          <Grid alignSelf="center">
            <ToggleButton
              label={t('label.on-hold')}
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
