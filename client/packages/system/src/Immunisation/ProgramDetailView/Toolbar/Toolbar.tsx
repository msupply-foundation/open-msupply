import React, { FC, PropsWithChildren } from 'react';
import {
  AppBarContentPortal,
  BasicTextInput,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftImmunisationProgram } from '../../api/hooks/useImmunisationProgram';

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
  const t = useTranslation('system');
  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container>
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          <BasicTextInput
            fullWidth
            value={draft.name}
            onChange={e =>
              onUpdate({
                name: e.target.value,
              } as Partial<DraftImmunisationProgram>)
            }
            label={t('label.name')}
            InputLabelProps={{ shrink: true }}
            helperText={isError ? error : ''}
            error={isError}
          />
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
