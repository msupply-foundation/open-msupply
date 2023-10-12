import React, { FC, useState } from 'react';
import { SensorFragment, useSensor } from '../api';
import { useTranslation } from '@common/intl';
import { useDialog } from '@common/hooks';
import { DialogButton, useConfirmationModal } from '@common/components';
import { ObjUtils } from '@common/utils';
import { Grid } from '@mui/material';
import { EditableSensorTab } from './EditableSensorTab';
import { NonEditableSensorTab } from './NonEditableSensorTab';

interface SensorEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensor: SensorFragment;
}

interface useDraftSensorControl {
  draft: SensorFragment;
  onUpdate: (patch: Partial<SensorFragment>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftSensor = (seed: SensorFragment): useDraftSensorControl => {
  const [sensor, setSensor] = useState<SensorFragment>({ ...seed });
  const { mutate, isLoading } = useSensor.document.update();
  const onUpdate = (patch: Partial<SensorFragment>) => {
    setSensor({ ...sensor, ...patch });
  };

  const onSave = async () => mutate(sensor);

  return {
    draft: sensor,
    onUpdate,
    onSave,
    isLoading,
  };
};

export const SensorEditModal: FC<SensorEditModalProps> = ({
  sensor,
  isOpen,
  onClose,
}) => {
  const t = useTranslation('coldchain');
  const { Modal } = useDialog({ isOpen, onClose });
  const { draft, onSave, onUpdate } = useDraftSensor(sensor);
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('message.conform-sensor-update'),
  });

  return (
    <Modal
      width={600}
      slideAnimation={false}
      title={t('title.edit-sensor-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={ObjUtils.isEqual(draft, sensor)}
          onClick={() =>
            getConfirmation({
              onConfirm: async () => {
                await onSave();
                onClose();
              },
            })
          }
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Grid
        display="flex"
        flex={1}
        container
        padding={4}
        width="100%"
        flexDirection="column"
        justifyContent={'space-around'}
        gap={1}
      >
        <EditableSensorTab draft={draft} onUpdate={onUpdate} />
        <NonEditableSensorTab draft={draft} />
      </Grid>
    </Modal>
  );
};
