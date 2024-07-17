import React, { FC, useState } from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  InlineSpinner,
  Box,
  InputLabel,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useImmunisationProgram } from '../../api';
import { AppRoute } from '@openmsupply-client/config';
import { ProgramSearchInput } from './ProgramSearchInput';
import { ProgramFragment } from '../../api/operations.generated';

interface RnRFormCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RnRFormCreateModal: FC<
RnRFormCreateModalProps
> = ({ isOpen, onClose }) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('programs');
  const navigate = useNavigate();
  const {
    query: { isLoading },
    draft,
    errorMessage,
    updatePatch,
    create: { create },
  } = useImmunisationProgram(t);
  const isInvalid = !draft.name.trim();

  const [selectedProgram, setSelectedProgram] = useState<ProgramFragment | null>(null);



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
                    .addPart(AppRoute.RnRForms)
                    .addPart(result.id)
                    .build()
                );
            } catch (e) {
              console.error(e);
            }
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      title={t('label.new-rnr-form')}
    >
      {!isLoading ? (
        <Grid flexDirection="column" display="flex" gap={2}>
          <Box alignItems="center" gap={1}>
            <InputLabel sx={{fontSize: 'small'}}>{t('label.program')}:</InputLabel>
          <ProgramSearchInput onChange={(program) => setSelectedProgram(program)} value={selectedProgram} />
          </Box>
        </Grid>
      ) : (
        <InlineSpinner />
      )}
    </Modal>
  );
};
