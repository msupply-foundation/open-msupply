import React, { FC, useState } from 'react';
import { BasicTextInput, DialogButton, Typography } from '@common/components';
import { ModalProps, useDialog, useNotification } from '@common/hooks';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Box,
  TextWithLabelRow,
  useAuthContext,
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
  const { user } = useAuthContext();
  const { localisedDateTime } = useFormatDateTime();

  const onUpdate = async () => {
    await mutateAsync({
      id: 'required',
      ...breach,
      comment: t('format.comment', {
        name: user?.name || 'unknown',
        date: localisedDateTime(new Date()),
        comment,
      }),
      unacknowledged: false,
    })
      .then(() => {
        setComment('');
        onOk();
      })
      .catch(e => {
        error(e.message)();
      });
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
          <Box paddingLeft={2}>
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
        <Box paddingTop={3}>
          <Typography sx={{ fontWeight: 'bold' }}>
            {t('label.comment')}
          </Typography>
          <BasicTextInput
            fullWidth
            multiline
            rows={3}
            onChange={event => setComment(event.target.value)}
            value={comment}
            helperText={t('message.acknowledge-breach-helptext')}
          />
        </Box>
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
