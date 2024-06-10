import React, { FC, PropsWithChildren } from 'react';
import {
  AppBarContentPortal,
  BaseButton,
  BasicTextInput,
  Grid,
  InlineSpinner,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftImmunisationProgram } from '../../api/hooks/useImmunisationProgram';

interface ToolbarProps {
  onUpdate: (patch: Partial<DraftImmunisationProgram>) => void;
  onSave: (patch: Partial<DraftImmunisationProgram>) => void;
  draft: DraftImmunisationProgram;
  isDirty?: boolean;
  isSaving?: boolean;
}

export const Toolbar: FC<PropsWithChildren<ToolbarProps>> = ({
  onUpdate,
  onSave,
  draft,
  isDirty,
  isSaving,
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
          />
          {isDirty && !isSaving && (
            <BaseButton onClick={() => onSave(draft)}>
              {t('button.save')}
            </BaseButton>
          )}
          {isSaving && <InlineSpinner />}
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
