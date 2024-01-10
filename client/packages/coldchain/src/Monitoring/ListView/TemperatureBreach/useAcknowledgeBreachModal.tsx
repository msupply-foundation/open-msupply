import React, { FC, useState } from 'react';
import { DialogButton, Typography } from '@common/components';
import { ModalProps, useDialog, useNotification } from '@common/hooks';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Box,
  DetailInputWithLabelRow,
  ModalRow,
  TextWithLabelRow,
} from '@openmsupply-client/common';
import {
  TemperatureBreachFragment,
  useTemperatureBreach,
} from '../../api/TemperatureBreach';

const TextRow = ({ label, text }: { label: string; text: string }) => (
  <TextWithLabelRow
    labelWidth="200px"
    labelProps={{ style: { textAlign: 'left' } }}
    label={label}
    text={text}
  />
);

const BreachModal = ({
  breach,

  Modal,
  onCancel,
  onOk,
}: {
  breach: TemperatureBreachFragment | undefined;

  Modal: FC<ModalProps>;
  onCancel: () => void;
  onOk: () => void;
}) => {
  const t = useTranslation('coldchain');
  const { localisedDistance, localisedDistanceToNow } = useFormatDateTime();
  const [comment, setComment] = useState('');
  const { mutateAsync } = useTemperatureBreach.document.update();
  const { error } = useNotification();

  const onUpdate = async () => {
    const result = await mutateAsync({
      id: 'required',
      ...breach,
      comment,
      unacknowledged: false,
    });
    if (result?.__typename === 'UpdateTemperatureBreachError') {
      error(result.error.description)();
      return;
    }
    setComment('');
    onOk();
  };

  return (
    <Modal
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            setComment('');
            onCancel();
          }}
        />
      }
      okButton={
        <DialogButton variant="ok" onClick={onUpdate} disabled={!comment} />
      }
      slideAnimation={false}
      title={t('heading.acknowledgeBreach')}
    >
      <Box display="flex" flexDirection="column">
        {!!breach && (
          <Box paddingLeft={1}>
            <TextRow
              label={t('label.breach-start')}
              text={t('messages.ago', {
                time: localisedDistanceToNow(breach.startDatetime),
              })}
            />
            <TextRow
              label={t('label.duration')}
              text={
                !breach.endDatetime
                  ? t('label.ongoing')
                  : localisedDistance(breach.startDatetime, breach.endDatetime)
              }
            />
            {!!breach.maxOrMinTemperature && (
              <TextRow
                label={t('message.max-or-min-temperature')}
                text={t('message.temperature', {
                  temperature: breach.maxOrMinTemperature,
                })}
              />
            )}
            <TextRow
              label={t('label.sensor-name')}
              text={breach.sensor?.name ?? ''}
            />
          </Box>
        )}
        <ModalRow>
          <Typography paddingTop={4} paddingBottom={2}>
            {t('message.acknowledge-breach-dialog')}
          </Typography>
        </ModalRow>
        <DetailInputWithLabelRow
          label={t('label.comment')}
          labelWidthPercentage={10}
          inputProps={{
            fullWidth: true,
            multiline: true,
            rows: 2,
            onChange: event => setComment(event.target.value),
            value: comment,
          }}
        />
      </Box>
    </Modal>
  );
};

export const useAcknowledgeBreachModal = () => {
  const { Modal, hideDialog, showDialog } = useDialog();
  const { success } = useNotification();
  const t = useTranslation();
  const [breach, setBreach] = useState<TemperatureBreachFragment | undefined>(
    undefined
  );

  const acknowledgeBreach = (breach: TemperatureBreachFragment) => {
    setBreach(breach);
    showDialog();
  };

  const onCancel = () => {
    setBreach(undefined);
    hideDialog();
  };

  const onOk = () => {
    setBreach(undefined);
    success(t('success.data-saved'))();
    hideDialog();
  };

  const AcknowledgeBreachModal = () => (
    <BreachModal
      Modal={Modal}
      breach={breach}
      onOk={onOk}
      onCancel={onCancel}
    />
  );

  return { AcknowledgeBreachModal, acknowledgeBreach };
};
