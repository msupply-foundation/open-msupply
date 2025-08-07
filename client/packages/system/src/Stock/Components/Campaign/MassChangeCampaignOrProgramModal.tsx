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
import { MasterListRowFragment } from '@openmsupply-client/system';
import { CampaignOrProgramSelector } from './CampaignOrProgramSelector';

interface ChangeCampaignOrProgramConfirmationModalProps<
  T extends {
    campaign?: CampaignNode | null;
    program?: ProgramFragment | null;
    item?: { id: string; masterLists?: MasterListRowFragment[] | null } | null;
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
    program?: ProgramFragment | null;
    item?: { id: string; masterLists?: MasterListRowFragment[] | null } | null;
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

  const findCommonMasterListItem = (): string | null => {
    if (rows.length === 0) return null;
    if (rows.length === 1) return rows[0]?.item?.id ?? null;

    for (const i of rows) {
      const candidateMasterLists = i?.item?.masterLists ?? [];

      const isContainedInAll = rows.every(row => {
        const rowMasterLists = row?.item?.masterLists ?? [];
        return candidateMasterLists.every(candidateMasterList =>
          rowMasterLists.some(
            rowMasterList => rowMasterList.id === candidateMasterList.id
          )
        );
      });

      if (isContainedInAll) {
        return i?.item?.id ?? null;
      }
    }

    return null;
  };

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
      <Box gap={1} display="flex" flexDirection="column">
        {!findCommonMasterListItem() && (
          <Alert severity="warning" sx={{ width: 320 }}>
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
              itemId={findCommonMasterListItem() ?? ''}
              clearProgram={!!findCommonMasterListItem()}
              onChange={async ({ campaign, program }) => {
                setCampaign(campaign);
                setProgram(program);
              }}
            />
          }
        />
      </Box>
    </ConfirmationModalLayout>
  );
};
