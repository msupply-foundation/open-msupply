import React, { useState } from 'react';
import {
  InputWithLabelRow,
  useTranslation,
  ConfirmationModalLayout,
  Grid,
  DialogButton,
  Alert,
  Box,
  CampaignNode,
} from '@openmsupply-client/common';
import { ProgramFragment } from '@openmsupply-client/programs';
import { CampaignOrProgramSelector } from './CampaignOrProgramSelector';

interface ChangeCampaignOrProgramConfirmationModalProps<
  T extends {
    campaign?: CampaignNode | null;
    program?: ProgramFragment | null;
    item?: { id: string; programs?: ProgramFragment[] | null } | null;
  },
> {
  isOpen: boolean;
  onCancel: () => void;
  clearSelected: () => void;
  rows: T[];
  onChange: (
    campaign?: CampaignNode | null,
    program?: ProgramFragment | null
  ) => Promise<void>;
}

export const ChangeCampaignOrProgramConfirmationModal = <
  T extends {
    campaign?: CampaignNode | null;
    programs?: ProgramFragment | null;
    item?: { id: string; programs?: ProgramFragment[] | null } | null;
  },
>({
  isOpen,
  onCancel,
  clearSelected,
  rows,
  onChange,
}: ChangeCampaignOrProgramConfirmationModalProps<T>) => {
  const t = useTranslation();

  const [campaign, setCampaign] = useState<CampaignNode | null>(null);
  const [program, setProgram] = useState<ProgramFragment | null>(null);
  const { itemId: commonItemId, hasMissingPrograms } =
    findCommonProgramItem(rows);

  return (
    <ConfirmationModalLayout
      isOpen={isOpen}
      title={t('heading.are-you-sure')}
      message={t('messages.confirm-change-campaign-or-program')}
      buttons={
        <>
          <Grid>
            <DialogButton variant="cancel" onClick={onCancel} />
          </Grid>
          <Grid>
            <DialogButton
              variant="ok"
              onClick={async () => {
                await onChange(campaign, program);
                setCampaign(null);
                setProgram(null);
                clearSelected();
                onCancel();
              }}
            />
          </Grid>
        </>
      }
    >
      <Box
        gap={1}
        display="flex"
        flexDirection="column"
        justifyContent="center"
      >
        {hasMissingPrograms && (
          <Alert severity="warning">
            {t('messages.campaign-or-program-restricted')}
          </Alert>
        )}
        <InputWithLabelRow
          label={t('label.campaign')}
          labelWidth="100px"
          Input={
            <CampaignOrProgramSelector
              campaignId={campaign?.id ?? undefined}
              programId={program?.id ?? undefined}
              itemId={commonItemId ?? ''}
              onChange={async ({ campaign, program }) => {
                setCampaign(campaign);
                setProgram(program);
              }}
              enableProgramAPI={!!commonItemId}
              fullWidth
            />
          }
        />
      </Box>
    </ConfirmationModalLayout>
  );
};

export const findCommonProgramItem = <
  T extends {
    item?: { id: string; programs?: ProgramFragment[] | null } | null;
  },
>(
  rows: T[]
): { itemId: string | null; hasMissingPrograms: boolean } => {
  if (rows.length === 0) return { itemId: null, hasMissingPrograms: false };
  if (rows.length === 1)
    return { itemId: rows[0]?.item?.id ?? null, hasMissingPrograms: false };

  const allPrograms = rows.map(row => row?.item?.programs ?? []);

  const commonPrograms = allPrograms.reduce((intersection, currentPrograms) => {
    return intersection.filter(program =>
      currentPrograms.some(currentProgram => currentProgram.id === program.id)
    );
  });

  if (commonPrograms.length === 0)
    return { itemId: null, hasMissingPrograms: true };

  const hasMissingPrograms = allPrograms.some(
    programs => programs.length !== commonPrograms.length
  );

  for (const row of rows) {
    const rowPrograms = row?.item?.programs ?? [];
    const hasCommon =
      rowPrograms.length === commonPrograms.length &&
      commonPrograms.every(commonProgram =>
        rowPrograms.some(rowProgram => rowProgram.id === commonProgram.id)
      );
    if (hasCommon) {
      return { itemId: row?.item?.id ?? null, hasMissingPrograms };
    }
  }

  return { itemId: null, hasMissingPrograms: true };
};
