import {
  CampaignNode,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { ProgramFragment } from '@openmsupply-client/programs';
import { InboundLineFragment } from '../../operations.generated';
import { useSaveInboundLines } from './useSaveInboundLines';

export const useChangeLinesCampaignOrProgram = (
  rows: InboundLineFragment[]
) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const { mutateAsync } = useSaveInboundLines();

  const onChangeCampaignOrProgram = async (
    campaign?: CampaignNode | null,
    program?: ProgramFragment | null
  ) => {
    try {
      const lines = rows.map(line => ({
        ...line,
        isUpdated: true,
        campaign,
        program,
      }));

      const { errorMessage } = await mutateAsync(lines);

      if (errorMessage) {
        error(errorMessage)();
        return;
      }

      success(
        t('messages.changed-campaign-or-program', {
          count: lines.length,
        })
      )();
    } catch (err) {
      error(t('error.something-wrong'))();
      throw err;
    }
  };
  return {
    onChangeCampaignOrProgram,
  };
};
