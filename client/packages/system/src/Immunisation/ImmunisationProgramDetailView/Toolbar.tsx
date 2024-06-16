import React, { FC, PropsWithChildren } from 'react';
import {
  AppBarContentPortal,
  BasicTextInput,
  DeleteIcon,
  DropdownMenu,
  DropdownMenuItem,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftImmunisationProgram } from '../api/hooks/useImmunisationProgram';
import { useDeleteSelectedVaccineCourses } from '../api/hooks/useDeleteSelectedVaccineCourses';

interface ToolbarProps {
  onUpdate: (patch: Partial<DraftImmunisationProgram>) => void;
  draft: DraftImmunisationProgram;
  isError: boolean;
  error: string;
}

export const Toolbar: FC<PropsWithChildren<ToolbarProps>> = ({
  onUpdate,
  draft,
  isError,
  error,
}: ToolbarProps) => {
  const t = useTranslation();
  const onDelete = useDeleteSelectedVaccineCourses();

  return (
    <AppBarContentPortal sx={{ width: '100%' }}>
      <Grid
        container
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 1,
          alignItems: 'end',
          gap: 2,
        }}
      >
        <Grid item flex={1}>
          <BasicTextInput
            fullWidth
            value={draft.name}
            onChange={e =>
              onUpdate({
                name: e.target.value,
              })
            }
            label={t('label.name')}
            InputLabelProps={{ shrink: true }}
            helperText={isError ? error : ''}
            error={isError}
          />
        </Grid>

        <Grid item>
          <DropdownMenu label={t('label.actions')}>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
