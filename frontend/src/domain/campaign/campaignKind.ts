import { t } from '../../intl';
import type { Campaign } from './campaignsResource';

export type CampaignKind = Campaign['kind'];

// What an activity's kind is called on screen. The wire carries CAMPAIGN /
// ROUTINE; a kind the client does not know reads as a campaign, matching the
// server (CampaignKind::Other reports as CAMPAIGN).
export const campaignKindLabel = (kind: CampaignKind): string =>
  kind === 'ROUTINE' ? t('label.routine') : t('label.campaign');
