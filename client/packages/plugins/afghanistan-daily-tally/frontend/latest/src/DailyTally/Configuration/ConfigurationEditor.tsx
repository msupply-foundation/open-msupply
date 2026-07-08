import React, { useState } from 'react';
import {
  Box,
  ShortTabList,
  Tab,
  TabContext,
  TabPanel,
} from '@openmsupply-client/common';
import { usePluginTranslation } from '../../locales';
import { DailyTallyConfig } from '../types';
import { DemographicGroupsSection } from './DemographicGroupsSection';
import { DoseOrderingSection } from './DoseOrderingSection';
import { SummaryTablesSection } from './SummaryTablesSection';
import { NonVaccineItemsSection } from './NonVaccineItemsSection';
import { WastageReasonsSection } from './WastageReasonsSection';
import { ImportExportSection } from './ImportExportSection';

interface Props {
  value: DailyTallyConfig;
  onChange: (next: DailyTallyConfig) => void;
}

// Top-level config editor surfaced via the host's `Plugins.configuration` slot
// (rendered inside Manage > Plugins > PluginConfigModal). The modal owns the
// chrome (title, save/cancel, persistence) so this Component only renders the
// form body and pushes changes through `onChange`.
//
// Sections are split across tabs so each panel scrolls its own content. State
// is local — the modal isn't a routed surface, so the active tab isn't in the
// URL.
const TABS = {
  Groups: 'groups',
  DoseOrder: 'dose-order',
  Summary: 'summary',
  NonVaccine: 'non-vaccine',
  Wastage: 'wastage',
} as const;

export const ConfigurationEditor: React.FC<Props> = ({ value, onChange }) => {
  const t = usePluginTranslation();
  const [tab, setTab] = useState<string>(TABS.Groups);

  // Defensive defaults — tolerate partial / drifted rows (the host may feed an
  // older-shape config; the editor never assumes every key is present).
  const demographicGroups = value.demographic_groups ?? [];
  const nonVaccineItems = value.non_vaccine_items ?? [];
  const summaryTables = value.summary_tables ?? [];
  const vaccineCourseOrder = value.vaccine_course_order ?? [];
  const doseOrder = value.dose_order ?? [];
  const wastageReasons = value.wastage_reasons ?? {
    open_vial: '',
    negative_adjustment: '',
  };

  return (
    <TabContext value={tab}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          // The dialog body can't scroll: its content is overflow:hidden and
          // the Cancel/OK footer sits just below it (inside the same form). So
          // bound the editor to the space between the modal title and that
          // footer — otherwise the bottom is clipped behind it. The modal is
          // 90vh tall; the subtraction is its fixed chrome (title + footer +
          // paddings). Everything below fills this height via flex.
          height: 'calc(90vh - 250px)',
          minHeight: 0,
        }}
      >
        <ImportExportSection value={value} onChange={onChange} />
        <Box display="flex" justifyContent="center" mb={1}>
          <ShortTabList
            value={tab}
            centered
            onChange={(_, next) => setTab(next)}
          >
            <Tab value={TABS.Groups} label={t('config.tab.groups')} />
            <Tab
              value={TABS.DoseOrder}
              label={t('config.tab.dose-order')}
            />
            <Tab value={TABS.Summary} label={t('config.tab.summary')} />
            <Tab value={TABS.NonVaccine} label={t('config.tab.non-vaccine')} />
            <Tab value={TABS.Wastage} label={t('config.tab.wastage')} />
          </ShortTabList>
        </Box>
        {/* Fixed-height, non-scrolling region: it fills the modal body but
            never scrolls itself. Each tab panel fills it (flex: 1) and owns its
            own scroll — so the Groups tab can scroll its detail panel alone,
            without a second scrollbar appearing on this outer container. */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Groups owns its internal layout (matrix + detail each scroll), so
              this panel doesn't scroll — it just gives them the height to fill. */}
          <TabPanel
            value={TABS.Groups}
            sx={{
              padding: 0,
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              // `display: flex` overrides the `hidden` attribute MUI sets on
              // inactive panels (it only relies on the UA `display: none`), so
              // re-assert it — otherwise this empty panel keeps its flex space
              // at the top of the region while another tab is active.
              '&[hidden]': { display: 'none' },
            }}
          >
            <DemographicGroupsSection
              value={demographicGroups}
              onChange={next =>
                onChange({ ...value, demographic_groups: next })
              }
              courseOrder={vaccineCourseOrder}
              onChangeCourseOrder={next =>
                onChange({ ...value, vaccine_course_order: next })
              }
            />
          </TabPanel>
          <TabPanel
            value={TABS.DoseOrder}
            sx={{ padding: 0, flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}
          >
            <DoseOrderingSection
              value={doseOrder}
              demographicGroups={demographicGroups}
              onChange={next => onChange({ ...value, dose_order: next })}
            />
          </TabPanel>
          <TabPanel
            value={TABS.Summary}
            sx={{ padding: 0, flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}
          >
            <SummaryTablesSection
              value={summaryTables}
              demographicGroups={demographicGroups}
              onChange={next => onChange({ ...value, summary_tables: next })}
            />
          </TabPanel>
          <TabPanel
            value={TABS.NonVaccine}
            sx={{ padding: 0, flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}
          >
            <NonVaccineItemsSection
              value={nonVaccineItems}
              onChange={next => onChange({ ...value, non_vaccine_items: next })}
            />
          </TabPanel>
          <TabPanel
            value={TABS.Wastage}
            sx={{ padding: 0, flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}
          >
            <WastageReasonsSection
              value={wastageReasons}
              onChange={next => onChange({ ...value, wastage_reasons: next })}
            />
          </TabPanel>
        </Box>
      </Box>
    </TabContext>
  );
};
