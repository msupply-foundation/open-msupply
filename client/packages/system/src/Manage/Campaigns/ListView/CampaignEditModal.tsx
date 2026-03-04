import React from 'react';
import {
  useTranslation,
  DetailContainer,
  Box,
  useDialog,
  DialogButton,
  InputWithLabelRow,
  BasicTextInput,
  DateTimePickerInput,
} from '@openmsupply-client/common';
import { DraftCampaign, defaultDraftCampaign } from '../api';

interface CampaignEditModalProps {
  campaign: DraftCampaign;
  isOpen: boolean;
  onClose: () => void;
  updateDraft: (campaign: Partial<DraftCampaign>) => void;
  upsert: () => Promise<void>;
}

export const CampaignEditModal = ({
  campaign,
  isOpen,
  onClose,
  updateDraft,
  upsert,
}: CampaignEditModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const { name, startDate, endDate, id } = campaign;
  const isValidName = name?.trim().length > 0;

  return (
    <Modal
      title={id ? t('title.edit-campaign') : t('title.create-campaign')}
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            onClose();
            updateDraft(defaultDraftCampaign);
          }}
        />
      }
      okButton={
        <DialogButton variant="ok" onClick={upsert} disabled={!isValidName} />
      }
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" gap={2}>
          <InputWithLabelRow
            key="name"
            label={t('label.name')}
            Input={
              <BasicTextInput
                sx={{ width: 250 }}
                value={name}
                onChange={e => updateDraft({ name: e.target.value })}
                onBlur={e => updateDraft({ name: e.target.value.trim() })}
              />
            }
          />
          <InputWithLabelRow
            key="start-date"
            label={t('label.start-date')}
            Input={
              <DateTimePickerInput
                width={250}
                value={new Date(startDate ?? '')}
                onChange={startDate => updateDraft({ startDate })}
              />
            }
          />
          <InputWithLabelRow
            key="end-date"
            label={t('label.end-date')}
            Input={
              <DateTimePickerInput
                width={250}
                value={new Date(endDate ?? '')}
                onChange={endDate => updateDraft({ endDate })}
              />
            }
          />
        </Box>
      </DetailContainer>
    </Modal>
  );
};
