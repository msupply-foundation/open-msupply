import React, { FC } from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  InlineSpinner,
  BasicTextInput,
  Box,
  InputLabel,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useImmunisationProgram } from '../api/hooks/useImmunisationProgram';
import { AppRoute } from '@openmsupply-client/config';

interface ImmunisationProgramCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImmunisationProgramCreateModal: FC<
  ImmunisationProgramCreateModalProps
> = ({ isOpen, onClose }) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('coldchain');
  const navigate = useNavigate();
  const {
    query: { isLoading },
    draft,
    errorMessage,
    updatePatch,
    create: { create },
  } = useImmunisationProgram(t);
  const isInvalid = !draft.name.trim();

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={isInvalid}
          onClick={async () => {
            try {
              const result = await create();
              if (result)
                navigate(
                  RouteBuilder.create(AppRoute.Programs)
                    .addPart(AppRoute.ImmunisationPrograms)
                    .addPart(result.id)
                    .build()
                );
            } catch (e) {
              // Should ideally just just catch `Permission Denied` as it's handled in graphql client
              console.error(e);
            }
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      title={t('label.create-new-program')}
    >
      {!isLoading ? (
        <Grid flexDirection="column" display="flex" gap={2}>
          <Box alignItems="center" gap={1}>
            <InputLabel>{t('label.name')}</InputLabel>
            <BasicTextInput
              fullWidth
              autoFocus
              value={draft.name}
              onChange={e => updatePatch({ name: e.target.value })}
              helperText={errorMessage}
              FormHelperTextProps={{
                sx: { color: 'error.main' },
              }}
              error={!!errorMessage}
            />
          </Box>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
