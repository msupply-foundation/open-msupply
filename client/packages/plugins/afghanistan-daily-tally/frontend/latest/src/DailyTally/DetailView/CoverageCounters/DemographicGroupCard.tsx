import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  ChevronDownIcon,
  Divider,
  Stack,
  Typography,
} from '@openmsupply-client/common';
import { usePluginLabelTranslation, usePluginTranslation } from '../../../locales';
import { DemographicGroup } from '../../types';
import { DoseRow } from './DoseRow';
import { GroupTotalBadge } from './GroupTotalBadge';

interface Props {
  group: DemographicGroup;
  readOnly?: boolean;
}

// One demographic group's banner card. Structural only: it takes no counts and
// renders no cell values itself — the running total lives in <GroupTotalBadge>
// and each cell in <CounterControl>, both of which subscribe to the tally store
// directly. So with `group`/`readOnly` stable (config never changes mid-edit),
// this memoised card NEVER re-renders on a +/- tap, regardless of group count.
export const DemographicGroupCard = React.memo(function DemographicGroupCard({
  group,
  readOnly = false,
}: Props) {
  const t = usePluginTranslation();
  const tLabel = usePluginLabelTranslation();
  const unit = group.unit ?? t('detail.default-unit');

  return (
    <Accordion
      defaultExpanded
      disableGutters
      elevation={0}
      sx={{ '&:before': { display: 'none' } }}
    >
      <AccordionSummary
        expandIcon={<ChevronDownIcon sx={{ color: 'primary.contrastText' }} />}
        sx={{
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flex={1}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {tLabel(group.label)}
          </Typography>
          <GroupTotalBadge group={group} unit={unit} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Stack divider={<Divider />}>
          {group.doses.map(dose => (
            <DoseRow
              key={dose.id}
              dose={dose}
              counters={group.counters}
              readOnly={readOnly}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
});
