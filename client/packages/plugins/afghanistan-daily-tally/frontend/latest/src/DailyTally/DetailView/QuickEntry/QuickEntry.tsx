import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@openmsupply-client/common';
import { DailyTallyConfig, DemographicGroup, SessionType } from '../../types';
import { useTallyDraftActions } from '../tallyDraftStore';
import { SessionHeader } from '../CoverageCounters/SessionHeader';
import { VaccineButton } from './VaccineButton';
import { usePluginTranslation } from '../../../locales';

interface Props {
  config: DailyTallyConfig;
  date: Date | null;
  onDateChange: (next: Date | null) => void;
  sessionType: SessionType | null;
  onSessionTypeChange: (next: SessionType) => void;
  readOnly?: boolean;
}

const COLUMN_COLORS = [
  { header: '#2563eb', light: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' }, // blue  (Male)
  { header: '#db2777', light: '#fdf2f8', border: '#fbcfe8', text: '#9d174d' }, // pink  (Female)
  { header: '#16a34a', light: '#f0fdf4', border: '#bbf7d0', text: '#15803d' }, // green (Women)
  { header: '#7c3aed', light: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6' }, // purple fallback
];

function getColumnColor(label: string): typeof COLUMN_COLORS[number] {
  const l = label.toLowerCase();
  if (l.includes('male') && !l.includes('female')) return COLUMN_COLORS[0]!;
  if (l.includes('female'))                         return COLUMN_COLORS[1]!;
  if (l.includes('women') || l.includes('woman'))  return COLUMN_COLORS[2]!;
  return COLUMN_COLORS[3]!;
}

interface ColumnRow {
  label: string;
  groupId: string;
  counterId: string;
}
interface Column {
  label: string;
  rows: ColumnRow[];
}

// Invert config structure: groups have counters (age→gender), but we want
// to display gender as columns with age groups as buttons inside.
// Counters that appear in multiple groups (Male/Female) become columns;
// groups whose counters are unique to them (Women) stay as their own column.
function buildColumns(groups: DemographicGroup[]): Column[] {
  // Map counterLabel → all (group, counter) pairs with that label
  const counterMap = new Map<string, ColumnRow[]>();
  for (const group of groups) {
    for (const counter of group.counters) {
      const existing = counterMap.get(counter.label) ?? [];
      existing.push({ label: group.label, groupId: group.id, counterId: counter.id });
      counterMap.set(counter.label, existing);
    }
  }

  const sharedCounterLabels = new Set<string>();
  const handledGroupIds = new Set<string>();

  for (const [label, rows] of counterMap) {
    if (rows.length > 1) {
      sharedCounterLabels.add(label);
      rows.forEach(r => handledGroupIds.add(r.groupId));
    }
  }

  const columns: Column[] = [];

  // Shared counters (Male, Female) → become columns with age group rows
  for (const label of sharedCounterLabels) {
    columns.push({ label, rows: counterMap.get(label)! });
  }

  // Groups whose counters aren't shared (Women 15-49) → stay as own column
  for (const group of groups) {
    if (!handledGroupIds.has(group.id)) {
      columns.push({
        label: group.label,
        rows: group.counters.map(c => ({
          label: c.label,
          groupId: group.id,
          counterId: c.id,
        })),
      });
    }
  }

  return columns;
}

const SplitLabel = ({ text }: { text: string }) => {
  const idx = text.indexOf('(');
  if (idx <= 0) return <>{text}</>;
  const english = text.slice(0, idx).trim();
  const rest = text.slice(idx).trim();
  return (
    <>
      <span style={{ display: 'block' }}>{english}</span>
      <span style={{ display: 'block', fontSize: '0.82em', lineHeight: 1.2, marginTop: 2 }}>{rest}</span>
    </>
  );
};

export const QuickEntry = ({ config, date, onDateChange, sessionType, onSessionTypeChange, readOnly = false }: Props) => {
  const groups = config.demographic_groups;
  const t = usePluginTranslation();
  const { incrementCount } = useTallyDraftActions();

  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [selectedDoses, setSelectedDoses] = useState<Set<string>>(new Set());
  const [patientCount, setPatientCount] = useState(0);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  useEffect(() => {
    if (!selectedGroup) return;
    const valid = selectedGroup.counters.find(c => c.id === selectedCounterId);
    if (!valid) setSelectedCounterId('');
    setSelectedDoses(new Set());
  }, [selectedGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo(() => buildColumns(groups), [groups]);

  const handleToggle = useCallback((doseId: string) => {
    setSelectedDoses(prev => {
      const next = new Set(prev);
      if (next.has(doseId)) next.delete(doseId);
      else next.add(doseId);
      return next;
    });
  }, []);

  const handleProceed = useCallback(() => {
    if (!selectedGroup || !selectedCounterId || selectedDoses.size === 0) return;
    selectedGroup.doses.forEach(dose => {
      if (selectedDoses.has(dose.id)) {
        incrementCount(dose.id, selectedCounterId);
      }
    });
    setSelectedGroupId('');
    setSelectedCounterId('');
    setSelectedDoses(new Set());
    setPatientCount(p => p + 1);
  }, [selectedGroup, selectedCounterId, selectedDoses, incrementCount]);

  if (!groups.length) return null;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', width: '100%' }}>
      <Stack gap={2.5}>
        <SessionHeader
          date={date}
          onDateChange={onDateChange}
          sessionType={sessionType}
          onSessionTypeChange={onSessionTypeChange}
          readOnly={readOnly}
        />

        {/* Patient counter strip */}
        <Box sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2.5, py: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
            {t('quick-entry.clients-recorded')}
          </Typography>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 900, lineHeight: 1 }}>
            {patientCount}
          </Typography>
        </Box>

        {/* Client columns: gender headers, age group buttons inside */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
            {t('quick-entry.client-heading')}
          </Typography>
          <Box display="grid" gridTemplateColumns={`repeat(${Math.min(columns.length, 4)}, minmax(0, 1fr))`} gap={1.5}>
            {columns.map(col => {
              const color = getColumnColor(col.label);
              return (
                <Box
                  key={col.label}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: col.rows.some(r => r.groupId === selectedGroupId && r.counterId === selectedCounterId)
                      ? color.header
                      : color.border,
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Column header = gender (Male / Female / Women) */}
                  <Box sx={{ bgcolor: color.header, px: 1.5, py: 1, textAlign: 'center' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#fff' }}>
                      <SplitLabel text={t(col.label, { defaultValue: col.label })} />
                    </Typography>
                  </Box>

                  {/* Rows = age groups as buttons */}
                  <Box sx={{ bgcolor: color.light, p: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {col.rows.map(row => {
                      const isSelected = selectedGroupId === row.groupId && selectedCounterId === row.counterId;
                      return (
                        <Button
                          key={`${row.groupId}-${row.counterId}`}
                          disabled={readOnly}
                          onClick={() => {
                            setSelectedGroupId(row.groupId);
                            setSelectedCounterId(row.counterId);
                            setSelectedDoses(new Set());
                          }}
                          sx={{
                            borderRadius: 1.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            width: '100%',
                            minHeight: 48,
                            height: 'auto',
                            px: 1,
                            py: 1,
                            border: '1.5px solid',
                            transition: 'all 0.15s',
                            ...(isSelected
                              ? { bgcolor: color.header, color: '#fff', borderColor: color.header, boxShadow: `0 2px 8px ${color.header}44`, '&:hover': { bgcolor: color.header } }
                              : { bgcolor: 'background.paper', color: color.text, borderColor: color.border, '&:hover': { bgcolor: color.light, borderColor: color.header } }
                            ),
                          }}
                        >
                          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'center', lineHeight: 1.3, display: 'block' }}>
                            <SplitLabel text={t(row.label, { defaultValue: row.label })} />
                          </span>
                        </Button>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Dose toggle grid */}
        {selectedGroup && selectedCounterId && (
          <Box sx={{ pb: 9 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', fontWeight: 600 }}>
              {t('quick-entry.doses-heading')}
            </Typography>
            <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(130px, 1fr))" gap={1.5}>
              {selectedGroup.doses.map(dose => (
                <VaccineButton
                  key={dose.id}
                  dose={dose}
                  counterId={selectedCounterId}
                  isSelected={selectedDoses.has(dose.id)}
                  onToggle={handleToggle}
                  readOnly={readOnly}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Sticky Proceed bar */}
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 1.5,
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="contained"
            color="success"
            size="large"
            disabled={selectedDoses.size === 0 || readOnly}
            onClick={handleProceed}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', minWidth: 160 }}
          >
            {t('quick-entry.record-client')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
