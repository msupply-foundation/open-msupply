import React, { FC } from 'react';
import {
  useTranslation,
  DetailContainer,
  DetailInputWithLabelRow,
  DetailSection,
  Grid,
  Box,
  BasicSpinner,
  useDialog,
  DialogButton,
  useKeyboardHeightAdjustment,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../..';

interface FacilityEditModalProps {
  nameId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FacilityEditModal: FC<FacilityEditModalProps> = ({
  nameId,
  isOpen,
  onClose,
}) => {
  const { data, isLoading } = useName.document.get(nameId);
  const t = useTranslation('manage');
  const isDisabled = true;
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const height = useKeyboardHeightAdjustment(600);

  if (isLoading) return <BasicSpinner />;

  return !!data ? (
    <Modal
      title={t('label.edit-facility')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      height={height}
      width={1024}
    >
      <DetailContainer>
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <NameRenderer
            isStore={!!data.store}
            label={data.name}
            sx={{ fontWeight: 'bold', fontSize: 18 }}
          />
          <Grid container flex={1} flexDirection="row" gap={4}>
            <DetailSection title="">
              <DetailInputWithLabelRow
                label={t('label.code')}
                inputProps={{ value: data.code, disabled: isDisabled }}
              />
            </DetailSection>
          </Grid>
        </Box>
      </DetailContainer>
    </Modal>
  ) : null;
};
