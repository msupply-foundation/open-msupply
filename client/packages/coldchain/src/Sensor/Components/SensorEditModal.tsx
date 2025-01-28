import React, { FC, useState } from 'react';
import { SensorFragment, useSensor } from '../api';
import { useTranslation } from '@common/intl';
import { useDialog } from '@common/hooks';
import { DialogButton, useConfirmationModal } from '@common/components';
import { ObjUtils } from '@common/utils';
import { Box } from '@openmsupply-client/common';
import { SensorLineForm } from './SensorLineForm';

interface SensorEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  sensor: SensorFragment;
}

export interface UseDraftSensorControl {
  draft: SensorFragment;
  onUpdate: (patch: Partial<SensorFragment>) => void;
  onSave?: () => Promise<void>;
}

const useDraftSensor = (seed: SensorFragment): UseDraftSensorControl => {
  const [sensor, setSensor] = useState<SensorFragment>(seed);
  const { mutate } = useSensor.document.update();
  const onUpdate = (patch: Partial<SensorFragment>) => {
    setSensor({ ...sensor, ...patch });
  };

  const onSave = async () => mutate(sensor);

  return {
    draft: sensor,
    onUpdate,
    onSave,
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
    message: t('messages.confirm-sensor-update'),
  });

  return (
    <Modal
      width={600}
      slideAnimation={false}
      title={t('title.sensor-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={ObjUtils.isEqual(draft, sensor)}
          onClick={() =>
            getConfirmation({
              onConfirm: async () => {
                await onSave?.();
                onClose();
              },
            })
          }
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Box display="flex" width="100%" justifyContent="center" padding={3}>
        <SensorLineForm draft={draft} onUpdate={onUpdate} />
      </Box>
    </Modal>
  );
};
