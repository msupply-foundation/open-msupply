import React, { FC, useState } from 'react';
import { SensorFragment, useSensor } from '../api';
import { useTranslation } from '@common/intl';
import { useDialog } from '@common/hooks';
import { DialogButton, useConfirmationModal } from '@common/components';
import { ObjUtils } from '@common/utils';
import { Grid } from 'packages/common/src';
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
  const t = useTranslation('inventory');
  const { Modal } = useDialog({ isOpen, onClose });
  const { draft, onSave, onUpdate } = useDraftSensor(sensor);
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: 'need to update this string',
  });

  console.log('sensor', sensor);

  return (
    <Modal
      width={700}
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
        container
        paddingBottom={4}
        flexDirection="row"
        justifyContent="space-evenly"
      >
        <Grid
          item
          alignItems="center"
          justifyContent="space-around"
          display="flex"
          flexDirection="column"
          padding={2}
        >
          <EditableSensorTab draft={draft} onUpdate={onUpdate} />
        </Grid>
        <Grid
          item
          alignItems="right"
          display="flex"
          flexDirection="column"
          padding={2}
        >
          <NonEditableSensorTab draft={draft} />
        </Grid>
      </Grid>
    </Modal>
  );
};
