import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  AppBarButtonsPortal,
  AppBarContentPortal,
  BasicTextInput,
  Box,
  ButtonWithIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  DateUtils,
  DownloadIcon,
  DialogButton,
  Formatter,
  FnUtils,
  LoadingButton,
  NothingHere,
  PrinterIcon,
  RouteBuilder,
  SaveIcon,
  Select,
  Stack,
  Switch,
  Typography,
  ReasonOptionNodeType,
  UpdatePrescriptionStatusInput,
  UpdateStocktakeStatusInput,
  useDialog,
  useNotification,
  usePreferences,
  useQuery,
  useBreadcrumbs,
  useSimplifiedTabletUI,
  useTranslation,
  ItemNodeType,
  useGql,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  useDemographicData,
  useItemApi,
  usePatient,
  useReasonOptions,
} from '@openmsupply-client/system';
import { useMasterListGraphQL } from '@openmsupply-client/system/src/MasterList/api/useMasterListGraphQL';
import {
  usePrescription,
  usePrescriptionList,
} from '@openmsupply-client/invoices/src/Prescriptions/api';
import { usePrescriptionGraphQL } from '@openmsupply-client/invoices/src/Prescriptions/api/usePrescriptionGraphQL';
import { useStocktakeGraphQL } from '@openmsupply-client/inventory/src/Stocktake/api/useStocktakeGraphQL';
import {
  DemographicNodeLite,
  isChild011Bucket,
  isChild1223Bucket,
  isChild25Bucket,
  isWomenNonPregnantBucket,
  isWomenPregnantBucket,
  resolveDemographicBuckets,
} from './demographicBuckets';
import { buildPrintableHtml, downloadPdfFromHtml, printHtml } from './printHelpers';

type TallyStockLine = {
  id: string;
  batch?: string | null;
  expiryDate?: string | null;
  availableNumberOfPacks: number;
  packSize: number;
};

type ItemGroup = {
  itemId: string;
  name: string;
  unitName: string;
  isVaccine: boolean;
  doses: number;
  sohPacks: number;
  stockLines: TallyStockLine[];
};

type DailyTallyRow = {
  itemId: string;
  item: string;
  soh: number;
  used: number;
  units: string;
  openVialWastage: boolean;
  wastage: number;
  remainingStock: number;
  isVaccine: boolean;
  doses: number;
  stockLines: TallyStockLine[];
  batchDraftById?: Record<string, BatchDraft>;
};

type BatchDraft = {
  used: number;
  openVialWastage: boolean;
  wastage: number;
};

type RowDraft = {
  used: number;
  openVialWastage: boolean;
  wastage: number;
  batchDraftById?: Record<string, BatchDraft>;
};

type ConfirmationSummaryRow = {
  item: string;
  batch: string;
  issued: string;
  wastage: string;
};

type CoverageSummaryRow = {
  itemId: string;
  itemName: string;
  itemDisplayName: string;
  doseLabel?: string;
  childUnderOneMale: number;
  childUnderOneFemale: number;
  childOneToTwoMale: number;
  childOneToTwoFemale: number;
  childTwoToFiveMale: number;
  childTwoToFiveFemale: number;
  womenNonPregnant: number;
  womenPregnant: number;
};

type ChildCoverageAgeGroup = {
  id: string;
  label: string;
  male: number;
  female: number;
};

type WomenCoverageAgeGroup = {
  id: string;
  label: string;
  count: number;
};

type VaccineCoverageDraft = {
  isOpen: boolean;
  childAgeGroups: ChildCoverageAgeGroup[];
  womenAgeGroups: WomenCoverageAgeGroup[];
};

type CoverageFieldVisibility = {
  showChild: boolean;
  showWomen: boolean;
};

type WorkflowStep =
  | 'tally'
  | 'coverage'
  | 'course-items'
  | 'allocation'
  | 'wastage'
  | 'non-vaccine';
type TallyAgeKey = 'under1' | 'oneToTwo' | 'twoToFive';
type TallyGenderKey = 'male' | 'female';

type VaccineSessionTallyDraft = {
  counts: Record<TallyAgeKey, Record<TallyGenderKey, number>>;
};

type TallyTapAction = {
  itemId: string;
  ageKey: TallyAgeKey;
  genderKey: TallyGenderKey;
  doseId?: string;
};

type VaccineCourseDose = {
  id: string;
  label: string;
};

type CourseItemSelectionCandidate = {
  courseName: string;
  items: Array<{
    itemId: string;
    itemName: string;
    soh: number;
  }>;
};

const tallyAgeGroups: Array<{ key: TallyAgeKey; label: string }> = [
  { key: 'under1', label: '0 to 11 months' },
  { key: 'oneToTwo', label: '1 to 2 years' },
  { key: 'twoToFive', label: '2 to 5 years' },
];
const tallyAgeKeyByIndex: TallyAgeKey[] = ['under1', 'oneToTwo', 'twoToFive'];
const womenNonPregnantTallyKey: TallyAgeKey = 'under1';
const womenPregnantTallyKey: TallyAgeKey = 'oneToTwo';

const tallyGenderGroups: Array<{ key: TallyGenderKey; label: string }> = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
];

const createEmptySessionTallyDraft = (): VaccineSessionTallyDraft => ({
  counts: {
    under1: { male: 0, female: 0 },
    oneToTwo: { male: 0, female: 0 },
    twoToFive: { male: 0, female: 0 },
  },
});

const sessionTallyVaccineTotal = (draft: VaccineSessionTallyDraft | undefined) => {
  if (!draft) return 0;

  return tallyAgeGroups.reduce(
    (ageTotal, { key: ageKey }) =>
      ageTotal +
      tallyGenderGroups.reduce(
        (genderTotal, { key: genderKey }) =>
          genderTotal + (draft.counts[ageKey]?.[genderKey] ?? 0),
        0
      ),
    0
  );
};

const getSessionTallyKey = (itemId: string, doseId?: string) =>
  doseId ? `${itemId}::${doseId}` : itemId;

const getSessionTallyVaccineTotalForItem = (
  tallyByKey: Record<string, VaccineSessionTallyDraft>,
  row: DailyTallyRow,
  itemDoses: VaccineCourseDose[]
) => {
  if (itemDoses.length === 0) {
    return sessionTallyVaccineTotal(tallyByKey[getSessionTallyKey(row.itemId)]);
  }

  const hasDoseScopedDraft = itemDoses.some(dose =>
    Boolean(tallyByKey[getSessionTallyKey(row.itemId, dose.id)])
  );

  if (!hasDoseScopedDraft) {
    return sessionTallyVaccineTotal(tallyByKey[getSessionTallyKey(row.itemId)]);
  }

  return itemDoses.reduce(
    (total, dose) =>
      total + sessionTallyVaccineTotal(tallyByKey[getSessionTallyKey(row.itemId, dose.id)]),
    0
  );
};

const sessionTallyGenderTotals = (
  tallyByItem: Record<string, VaccineSessionTallyDraft>,
  vaccineRows: DailyTallyRow[]
) => {
  const male = vaccineRows.reduce((total, row) => {
    const draft = tallyByItem[row.itemId];
    return (
      total +
      tallyAgeGroups.reduce(
        (ageTotal, { key }) => ageTotal + (draft?.counts[key]?.male ?? 0),
        0
      )
    );
  }, 0);

  const female = vaccineRows.reduce((total, row) => {
    const draft = tallyByItem[row.itemId];
    return (
      total +
      tallyAgeGroups.reduce(
        (ageTotal, { key }) => ageTotal + (draft?.counts[key]?.female ?? 0),
        0
      )
    );
  }, 0);

  return {
    male,
    female,
    total: male + female,
  };
};

const isNonPregnantWomenGroup = (group: WomenCoverageAgeGroup) => {
  const key = `${group.id} ${group.label}`.toLowerCase();
  return key.includes('non-pregnant') || key.includes('non pregnant');
};

const isPregnantWomenGroup = (group: WomenCoverageAgeGroup) => {
  const key = `${group.id} ${group.label}`.toLowerCase();
  return key.includes('pregnant') && !isNonPregnantWomenGroup(group);
};

const womenCoverageLabel = (
  nonPregnantGroup: WomenCoverageAgeGroup | undefined,
  pregnantGroup: WomenCoverageAgeGroup | undefined
) => {
  const stripQualifier = (value: string) =>
    value
      .replace(/\s*[-–]\s*(non\s*pregnant|pregnant)\b/i, '')
      .replace(/\b(non\s*pregnant|pregnant)\b/i, '')
      .trim();

  const base = stripQualifier(nonPregnantGroup?.label ?? '') || stripQualifier(pregnantGroup?.label ?? '');
  return base || nonPregnantGroup?.label || pregnantGroup?.label || 'Women';
};

const resolveWomenCoverageGroups = (groups: WomenCoverageAgeGroup[]) => {
  const nonPregnantGroup =
    groups.find(isNonPregnantWomenGroup) || groups.find(group => !isPregnantWomenGroup(group));

  const pregnantGroup =
    groups.find(
      group =>
        isPregnantWomenGroup(group) &&
        group.id !== nonPregnantGroup?.id
    ) || groups.find(group => group.id !== nonPregnantGroup?.id);

  return { nonPregnantGroup, pregnantGroup };
};

const defaultChildCoverageAgeGroups = (): ChildCoverageAgeGroup[] => [
  {
    id: 'child-0-11',
    label: 'Children under 1 year',
    male: 0,
    female: 0,
  },
  {
    id: 'child-12-23',
    label: 'Children 1 to 2 years',
    male: 0,
    female: 0,
  },
  {
    id: 'child-24-59',
    label: 'Children 2 to 5 years',
    male: 0,
    female: 0,
  },
];

const defaultWomenCoverageAgeGroups = (): WomenCoverageAgeGroup[] => [
  {
    id: 'women-15-49-non-pregnant',
    label: 'Women 15 to 49 years - Non pregnant',
    count: 0,
  },
  {
    id: 'women-15-49-pregnant',
    label: 'Women 15 to 49 years - Pregnant',
    count: 0,
  },
];

const mapFixedDemographicGroups = (
  demographics: DemographicNodeLite[] | undefined
): Pick<VaccineCoverageDraft, 'childAgeGroups' | 'womenAgeGroups'> => {
  const compareByName = (a: DemographicNodeLite, b: DemographicNodeLite) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });

  const configured = (demographics ?? []).filter(group => {
    const normalizedName = group.name.trim().toLowerCase();
    const normalizedId = group.id.trim().toLowerCase();
    return normalizedName !== 'general population' && normalizedId !== 'general-population';
  });

  if (!configured.length) {
    return {
      childAgeGroups: defaultChildCoverageAgeGroups(),
      womenAgeGroups: defaultWomenCoverageAgeGroups(),
    };
  }

  const isWomenDemographic = (group: DemographicNodeLite) => {
    const key = `${group.id} ${group.name}`.toLowerCase();
    return (
      group.id.startsWith('women-') ||
      key.includes('women') ||
      key.includes('woman') ||
      key.includes('female') ||
      key.includes('pregnant')
    );
  };

  const childGroups = configured
    .filter(group => !isWomenDemographic(group))
    .sort(compareByName);
  const womenGroups = configured.filter(isWomenDemographic).sort(compareByName);

  return {
    childAgeGroups: childGroups.map(group => ({
      id: group.id,
      label: group.name,
      male: 0,
      female: 0,
    })),
    womenAgeGroups: womenGroups.map(group => ({
      id: group.id,
      label: group.name,
      count: 0,
    })),
  };
};

const defaultVaccineCoverageDraft = (
  template?: Pick<VaccineCoverageDraft, 'childAgeGroups' | 'womenAgeGroups'>
): VaccineCoverageDraft => {
  const groups = template ?? {
    childAgeGroups: defaultChildCoverageAgeGroups(),
    womenAgeGroups: defaultWomenCoverageAgeGroups(),
  };

  return {
    isOpen: false,
    childAgeGroups: groups.childAgeGroups.map(group => ({
      id: group.id,
      label: group.label,
      male: 0,
      female: 0,
    })),
    womenAgeGroups: groups.womenAgeGroups.map(group => ({
      id: group.id,
      label: group.label,
      count: 0,
    })),
  };
};

const toNumeric = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normaliseReason = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase();

const round = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

const defaultDailyTallyReference = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = now.toLocaleString('en-GB', { month: 'short' });
  const year = String(now.getFullYear());

  return `Daily tally - ${day} ${month} ${year}`;
};

const toDisplayUnits = (packs: number, isVaccine: boolean, doses: number) => {
  if (isVaccine && doses > 0) return round(packs * doses);
  return round(packs);
};

const toPacks = (displayUnits: number, isVaccine: boolean, doses: number) => {
  if (isVaccine && doses > 0) return round(displayUnits / doses);
  return round(displayUnits);
};

const parseInput = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const parseWholeNumber = (value: string) => Math.floor(parseInput(value));
const numericInputMode = 'numeric' as const;
const numericHtmlInputProps = { pattern: '[0-9]*' };
const selectZeroValueOnFocus = (
  event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
) => {
  if (event.target.value === '0') {
    const input = event.target;
    input.select();
    window.setTimeout(() => {
      if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(0, input.value.length);
      } else {
        input.select();
      }
    }, 0);
  }
};
const compactNumberInputSx = {
  width: { xs: '100%', sm: 92 },
  '& .MuiInputBase-input': {
    textAlign: 'center',
  },
};
const highlightedIssuedInputSlotProps = {
  input: {
    sx: {
      backgroundColor: 'rgba(255, 193, 7, 0.22)',
      boxShadow: 'inset 0 0 0 1px rgba(245, 124, 0, 0.5)',
    },
  },
};

const formatPatientName = (value: string) => {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return normalized;

  // Some patient names are stored as "last, first"; display as "first last".
  if (normalized.includes(',')) {
    const [lastName, ...firstParts] = normalized
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    if (firstParts.length > 0) {
      return `${firstParts.join(' ')} ${lastName}`.trim();
    }
  }

  return normalized.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
};

const getWomenCoverageTotals = (coverage: VaccineCoverageDraft | undefined) => {
  if (!coverage) {
    return { nonPregnant: 0, pregnant: 0 };
  }

  const { nonPregnantGroup, pregnantGroup } = resolveWomenCoverageGroups(
    coverage.womenAgeGroups
  );

  return {
    nonPregnant: nonPregnantGroup?.count ?? 0,
    pregnant: pregnantGroup?.count ?? 0,
  };
};

const getCoverageUsedTotal = (coverage: VaccineCoverageDraft | undefined) => {
  if (!coverage) return 0;

  const childTotal = coverage.childAgeGroups.reduce(
    (total, ageGroup) => total + ageGroup.male + ageGroup.female,
    0
  );
  const { nonPregnant, pregnant } = getWomenCoverageTotals(coverage);
  const womenTotal = nonPregnant + pregnant;

  return childTotal + womenTotal;
};

const getVisibleCoverageUsedTotal = (
  coverage: VaccineCoverageDraft | undefined,
  visibility: CoverageFieldVisibility
) => {
  if (!coverage) return 0;

  const childTotal = visibility.showChild
    ? coverage.childAgeGroups.reduce(
        (total, ageGroup) => total + ageGroup.male + ageGroup.female,
        0
      )
    : 0;

  const womenTotal = visibility.showWomen
    ? (() => {
        const { nonPregnant, pregnant } = getWomenCoverageTotals(coverage);
        return nonPregnant + pregnant;
      })()
    : 0;

  return childTotal + womenTotal;
};

const hasVisibleCoverageValues = (
  coverage: VaccineCoverageDraft | undefined,
  visibility: CoverageFieldVisibility
) => {
  if (!coverage) return false;

  const childValues = visibility.showChild
    ? coverage.childAgeGroups.some(ageGroup => ageGroup.male > 0 || ageGroup.female > 0)
    : false;

  const womenValues = visibility.showWomen
    ? (() => {
        const { nonPregnant, pregnant } = getWomenCoverageTotals(coverage);
        return nonPregnant > 0 || pregnant > 0;
      })()
    : false;

  return childValues || womenValues;
};

const hasCoverageValues = (coverage: VaccineCoverageDraft | undefined) => {
  if (!coverage) return false;

  const childValues = coverage.childAgeGroups.some(
    ageGroup => ageGroup.male > 0 || ageGroup.female > 0
  );
  const { nonPregnant, pregnant } = getWomenCoverageTotals(coverage);
  const womenValues = nonPregnant > 0 || pregnant > 0;

  return childValues || womenValues;
};

const coverageSummaryText = (
  vaccineRows: DailyTallyRow[],
  coverageByItem: Record<string, VaccineCoverageDraft>,
  coverageFieldVisibilityByItem: Record<string, CoverageFieldVisibility>
) => {
  const lines = vaccineRows.flatMap(row => {
    const coverage = coverageByItem[row.itemId];
    const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
      showChild: false,
      showWomen: false,
    };
    if (!hasVisibleCoverageValues(coverage, visibility)) return [];
    if (!coverage) return [];

    const childSummary = visibility.showChild
      ? coverage.childAgeGroups
          .filter(group => group.male > 0 || group.female > 0)
          .map(group => `${group.label} M:${group.male} F:${group.female}`)
          .join(' ; ')
      : '';
    const { nonPregnant, pregnant } = getWomenCoverageTotals(coverage);
    const womenSummary = visibility.showWomen
      ? [
          nonPregnant > 0 ? `Non pregnant ${nonPregnant}` : null,
          pregnant > 0 ? `Pregnant ${pregnant}` : null,
        ]
          .filter((part): part is string => part !== null)
          .join(' ; ')
      : '';

    return [
      `${row.item} => Child: ${childSummary || '0'} | Women: ${womenSummary || '0'}`,
    ];
  });

  return lines.join(' || ');
};

const coveragePayloadForLine = (
  row: DailyTallyRow,
  coverage: VaccineCoverageDraft | undefined,
  visibility: CoverageFieldVisibility
) => {
  if (!coverage || !hasVisibleCoverageValues(coverage, visibility)) return null;

  return {
    version: 'DT_COVERAGE_V1',
    itemId: row.itemId,
    itemName: row.item,
    child: visibility.showChild
      ? coverage.childAgeGroups.map(group => ({
          groupId: group.id,
          groupName: group.label,
          male: group.male,
          female: group.female,
        }))
      : [],
    women: visibility.showWomen
      ? coverage.womenAgeGroups.map(group => ({
          groupId: group.id,
          groupName: group.label,
          count: group.count,
        }))
      : [],
  };
};

const buildCoverageSummaryRows = (
  vaccineRows: DailyTallyRow[],
  coverageByItem: Record<string, VaccineCoverageDraft>,
  demographics: DemographicNodeLite[] | undefined,
  coverageFieldVisibilityByItem: Record<string, CoverageFieldVisibility>,
  perDoseCoverageByItem?: Record<string, Record<string, VaccineCoverageDraft>>,
  dosesForItemId?: Record<string, VaccineCourseDose[]>
): CoverageSummaryRow[] => {
  const buckets = resolveDemographicBuckets(demographics);

  const summariseCoverage = (
    row: DailyTallyRow,
    coverage: VaccineCoverageDraft,
    visibility: CoverageFieldVisibility,
    doseLabel?: string
  ): CoverageSummaryRow => {
    const summary: CoverageSummaryRow = {
      itemId: row.itemId,
      itemName: row.item,
      itemDisplayName: row.item,
      doseLabel,
      childUnderOneMale: 0,
      childUnderOneFemale: 0,
      childOneToTwoMale: 0,
      childOneToTwoFemale: 0,
      childTwoToFiveMale: 0,
      childTwoToFiveFemale: 0,
      womenNonPregnant: 0,
      womenPregnant: 0,
    };

    if (visibility.showChild) {
      for (const child of coverage.childAgeGroups) {
        if (isChild011Bucket(child.id, child.label, buckets)) {
          summary.childUnderOneMale += child.male;
          summary.childUnderOneFemale += child.female;
          continue;
        }

        if (isChild1223Bucket(child.id, child.label, buckets)) {
          summary.childOneToTwoMale += child.male;
          summary.childOneToTwoFemale += child.female;
          continue;
        }

        if (isChild25Bucket(child.id, child.label, buckets)) {
          summary.childTwoToFiveMale += child.male;
          summary.childTwoToFiveFemale += child.female;
        }
      }
    }

    if (visibility.showWomen) {
      const { nonPregnant, pregnant } = getWomenCoverageTotals(coverage);
      summary.womenNonPregnant = nonPregnant;
      summary.womenPregnant = pregnant;
    }

    return summary;
  };

  return vaccineRows
    .flatMap(row => {
      const coverage = coverageByItem[row.itemId];
      const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
        showChild: false,
        showWomen: false,
      };
      const rowDoses = dosesForItemId?.[row.itemId] ?? [];

      if (rowDoses.length > 0 && perDoseCoverageByItem) {
        const perDoseRows = rowDoses
          .map(dose => {
            const doseCoverage = perDoseCoverageByItem[row.itemId]?.[dose.id];
            if (!doseCoverage || !hasVisibleCoverageValues(doseCoverage, visibility)) {
              return null;
            }
            return summariseCoverage(row, doseCoverage, visibility, dose.label);
          })
          .filter((summary): summary is CoverageSummaryRow => summary !== null);

        if (perDoseRows.length > 0) return perDoseRows;
      }

      if (!coverage || !hasVisibleCoverageValues(coverage, visibility)) return [];
      return [summariseCoverage(row, coverage, visibility)];
    })
    .sort((a, b) => a.itemDisplayName.localeCompare(b.itemDisplayName));
};

const dailyTallyLineNote = (
  row: DailyTallyRow,
  coverage: VaccineCoverageDraft | undefined,
  visibility: CoverageFieldVisibility,
  perDoseCoverages?: Array<{ doseId: string; doseLabel: string; coverage: VaccineCoverageDraft }>
) => {
  if (!row.isVaccine) return `Daily tally issued (${row.item})`;

  if (perDoseCoverages && perDoseCoverages.length > 0) {
    const hasAnyDoseValues = perDoseCoverages.some(dc =>
      hasVisibleCoverageValues(dc.coverage, visibility)
    );
    if (hasAnyDoseValues) {
      return JSON.stringify({
        version: 'DT_COVERAGE_V2',
        itemId: row.itemId,
        itemName: row.item,
        doses: perDoseCoverages.map(dc => ({
          doseId: dc.doseId,
          doseLabel: dc.doseLabel,
          child: visibility.showChild
            ? dc.coverage.childAgeGroups.map(g => ({
                groupId: g.id,
                groupName: g.label,
                male: g.male,
                female: g.female,
              }))
            : [],
          women: visibility.showWomen
            ? dc.coverage.womenAgeGroups.map(g => ({
                groupId: g.id,
                groupName: g.label,
                count: g.count,
              }))
            : [],
        })),
      });
    }
  }

  const payload = coveragePayloadForLine(row, coverage, visibility);
  if (!payload) return `Daily tally issued (${row.item})`;

  return JSON.stringify(payload);
};

const computeAggregateCoverage = (
  dosesCoverages: Record<string, VaccineCoverageDraft>,
  template: VaccineCoverageDraft
): VaccineCoverageDraft => {
  const allDrafts = Object.values(dosesCoverages);

  const childAgeGroups = template.childAgeGroups.map(templateGroup => {
    const male = allDrafts.reduce((sum, draft) => {
      const group = draft.childAgeGroups.find(g => g.id === templateGroup.id);
      return sum + (group?.male ?? 0);
    }, 0);
    const female = allDrafts.reduce((sum, draft) => {
      const group = draft.childAgeGroups.find(g => g.id === templateGroup.id);
      return sum + (group?.female ?? 0);
    }, 0);
    return { ...templateGroup, male, female };
  });

  const womenTemplateAndDraftGroups = new Map<string, WomenCoverageAgeGroup>();

  for (const group of template.womenAgeGroups) {
    womenTemplateAndDraftGroups.set(group.id, group);
  }

  for (const draft of allDrafts) {
    for (const group of draft.womenAgeGroups) {
      if (!womenTemplateAndDraftGroups.has(group.id)) {
        womenTemplateAndDraftGroups.set(group.id, group);
      }
    }
  }

  const womenAgeGroups = Array.from(womenTemplateAndDraftGroups.values()).map(templateGroup => {
    const count = allDrafts.reduce((sum, draft) => {
      const group = draft.womenAgeGroups.find(g => g.id === templateGroup.id);
      return sum + (group?.count ?? 0);
    }, 0);
    return { ...templateGroup, count };
  });

  return { isOpen: false, childAgeGroups, womenAgeGroups };
};

const allocateAcrossStockLines = (
  stockLines: TallyStockLine[],
  requiredPacks: number
) => {
  let remaining = requiredPacks;
  const byExpiry = [...stockLines].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });

  const allocations: Array<{ stockLine: TallyStockLine; packs: number }> = [];
  for (const stockLine of byExpiry) {
    if (remaining <= 0) break;
    const available = Math.max(0, stockLine.availableNumberOfPacks);
    if (available <= 0) continue;

    const allocated = Math.min(available, remaining);
    if (allocated > 0) {
      allocations.push({ stockLine, packs: round(allocated) });
      remaining = round(remaining - allocated);
    }
  }

  return { allocations, remaining };
};

const getSuggestedOpenVialWastageAmount = ({
  stockOnHand,
  used,
  doses,
}: {
  stockOnHand: number;
  used: number;
  doses: number;
}) => {
  if (doses <= 0 || used <= 0) return 0;

  const availableDoses = round(stockOnHand);
  const administered = round(used);
  const openUnitOnHand = round(availableDoses % doses);

  if (openUnitOnHand > 0) {
    if (administered <= openUnitOnHand) {
      return round(openUnitOnHand - administered);
    }

    const fromNewUnits = round(administered - openUnitOnHand);
    const remainder = round(fromNewUnits % doses);
    return remainder === 0 ? 0 : round(doses - remainder);
  }

  const remainder = round(administered % doses);
  return remainder === 0 ? 0 : round(doses - remainder);
};

const getSuggestedOpenVialWastage = ({
  soh,
  used,
  isVaccine,
  doses,
}: Pick<DailyTallyRow, 'soh' | 'used' | 'isVaccine' | 'doses'>) => {
  if (!isVaccine || doses <= 0 || used <= 0) return null;

  return getSuggestedOpenVialWastageAmount({
    stockOnHand: soh,
    used,
    doses,
  });
};

const sumBatchDraft = (
  batchDraftById: Record<string, BatchDraft> | undefined,
  key: 'used' | 'wastage'
) =>
  round(
    Object.values(batchDraftById ?? {}).reduce(
      (acc, draft) => acc + (draft?.[key] ?? 0),
      0
    )
  );

const batchLabel = (stockLine: TallyStockLine) => {
  const batch = stockLine.batch?.trim();
  return batch || stockLine.expiryDate || 'No batch';
};

const dailyTallyListPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart('daily-tally')
  .build();

export const DailyTallyView = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const theme = useTheme();
  const isPortraitOrientation = useMediaQuery('(orientation: portrait)');
  const isTabletOrSmaller = useMediaQuery(theme.breakpoints.down('md'));
  const keepTopRightButtonTextVisible = isTabletOrSmaller && isPortraitOrientation;
  const useDesktopCoverageSummaryLayout = true;
  const isSimplifiedTabletUI = useSimplifiedTabletUI();
  const preferences = usePreferences();
  const { useSimplifiedMobileUi = false } = preferences;
  const isSessionTallyStepEnabled = true;
  const isSimplifiedMode = isSimplifiedTabletUI || useSimplifiedMobileUi;
  const { error, success } = useNotification();
  const {
    create: { create: createPrescription },
  } = usePrescription();
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();
  const { stocktakeApi } = useStocktakeGraphQL();
  const { masterListApi } = useMasterListGraphQL();
  const { client: gqlClient } = useGql();
  const itemApi = useItemApi();
  const { data: demographicData } = useDemographicData.demographics.list();
  const { data: reasonOptionsData, isLoading: isReasonOptionsLoading } =
    useReasonOptions();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [filterText, setFilterText] = useState('');
  const [referenceText, setReferenceText] = useState(defaultDailyTallyReference);
  const [draftByItem, setDraftByItem] = useState<Record<string, RowDraft>>({});
  const [expandedByItem, setExpandedByItem] = useState<Record<string, boolean>>({});
  const [confirmSummaryOpen, setConfirmSummaryOpen] = useState(false);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [confirmSummaryRows, setConfirmSummaryRows] = useState<
    ConfirmationSummaryRow[]
  >([]);
  const [isVaccineBucketOpen] = useState(true);
  const [coverageByItem, setCoverageByItem] = useState<
    Record<string, VaccineCoverageDraft>
  >({});
  const coverageByItemRef = useRef<Record<string, VaccineCoverageDraft>>({});
  const [perDoseCoverageByItem, setPerDoseCoverageByItem] = useState<
    Record<string, Record<string, VaccineCoverageDraft>>
  >({});
  const perDoseCoverageByItemRef = useRef<Record<string, Record<string, VaccineCoverageDraft>>>({});
  const [selectedDoseIdByItem, setSelectedDoseIdByItem] = useState<Record<string, string>>({});
  const [expandedStepOneVaccineItemIds, setExpandedStepOneVaccineItemIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedNonVaccineItemIds, setExpandedNonVaccineItemIds] = useState<
    Record<string, boolean>
  >({});
  const [sessionTallyByItem, setSessionTallyByItem] = useState<
    Record<string, VaccineSessionTallyDraft>
  >({});
  const [selectedTallyItemId, setSelectedTallyItemId] = useState<string | null>(null);
  const [activeTallyGender, setActiveTallyGender] = useState<TallyGenderKey>('male');
  const [activeTallyAge, setActiveTallyAge] = useState<TallyAgeKey>('under1');
  const [tallyTapHistory, setTallyTapHistory] = useState<TallyTapAction[]>([]);
  const [selectedCourseItemIdsByCourse, setSelectedCourseItemIdsByCourse] = useState<
    Record<string, string[]>
  >({});
  const [expandedCoverageItemIds, setExpandedCoverageItemIds] = useState<Record<string, boolean>>({});
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const [showTallyTapHint, setShowTallyTapHint] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(
    isSessionTallyStepEnabled
      ? 'tally'
      : isSimplifiedMode
        ? 'allocation'
        : 'coverage'
  );

  const { Modal: ConfirmSummaryModal } = useDialog({
    isOpen: confirmSummaryOpen,
    onClose: () => setConfirmSummaryOpen(false),
    disableBackdrop: true,
  });

  const { Modal: DuplicateWarningModal } = useDialog({
    isOpen: duplicateWarningOpen,
    onClose: () => setDuplicateWarningOpen(false),
    disableBackdrop: true,
  });

  useEffect(() => {
    const root = contentContainerRef.current;
    let scrollContainer: HTMLElement | null = root;

    while (scrollContainer && scrollContainer !== document.body) {
      const overflowY = window.getComputedStyle(scrollContainer).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }

    const target = scrollContainer ?? document.documentElement;
    const previousScrollbarGutter = target.style.scrollbarGutter;
    const previousOverflowY = target.style.overflowY;

    target.style.scrollbarGutter = 'stable both-edges';
    target.style.overflowY = 'scroll';

    return () => {
      target.style.scrollbarGutter = previousScrollbarGutter;
      target.style.overflowY = previousOverflowY;
    };
  }, []);

  const duplicateDayRange = useMemo(() => {
    const now = new Date();
    return {
      from: DateUtils.formatRFC3339(DateUtils.startOfDay(now)),
      to: DateUtils.formatRFC3339(DateUtils.endOfDay(now)),
    };
  }, []);

  const tallyReference = referenceText.trim() || defaultDailyTallyReference();

  const {
    query: { data: sameDayTallyData },
  } = usePrescriptionList({
    first: 500,
    offset: 0,
    sortBy: { key: 'createdDateTime', direction: 'desc' },
    filterBy: {
      theirReference: { like: 'Daily tally -' },
      createdOrBackdatedDatetime: {
        afterOrEqualTo: duplicateDayRange.from,
        beforeOrEqualTo: duplicateDayRange.to,
      },
    },
  });

  const { data: patientData, isLoading: isPatientsLoading } =
    usePatient.document.list({
      first: 2000,
      sortBy: { key: 'name', direction: 'asc' },
    });

  const patientOptions = useMemo(
    () =>
      (patientData?.nodes ?? []).map(patient => ({
        value: patient.id,
        label: formatPatientName(patient.name),
      })),
    [patientData?.nodes]
  );

  const selectedPatientLabel = useMemo(() => {
    return (
      patientOptions.find(option => option.value === selectedPatientId)?.label ||
      'Not selected'
    );
  }, [patientOptions, selectedPatientId]);
  const sameDayTalliesForSelectedPatient = useMemo(
    () =>
      (sameDayTallyData?.nodes ?? []).filter(
        tally => tally.patientId === selectedPatientId
      ),
    [sameDayTallyData?.nodes, selectedPatientId]
  );
  const existingSameDayTallyForSelectedPatient =
    sameDayTalliesForSelectedPatient.length > 0;
  const duplicateWarningPatientName = formatPatientName(
    sameDayTalliesForSelectedPatient[0]?.otherPartyName || selectedPatientLabel
  );
  const shouldHighlightPatientSelection = !selectedPatientId;

  const openVialWastageReason = useMemo(
    () =>
      (reasonOptionsData?.nodes ?? []).find(
        reason =>
          reason.type === ReasonOptionNodeType.OpenVialWastage &&
          normaliseReason(reason.reason) === 'open vial wastage'
      ),
    [reasonOptionsData?.nodes]
  );

  const damagedReason = useMemo(
    () =>
      (reasonOptionsData?.nodes ?? []).find(
        reason =>
          reason.type === ReasonOptionNodeType.NegativeInventoryAdjustment &&
          normaliseReason(reason.reason) === 'damaged'
      ),
    [reasonOptionsData?.nodes]
  );

  const itemQueryParams = useMemo(
    () => ({
      sortBy: { key: 'name', direction: 'asc' as const, isDesc: false },
      offset: 0,
      first: 5000,
      filterBy: {
        type: { equalTo: ItemNodeType.Stock },
      },
    }),
    []
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: itemApi.keys.paramList(itemQueryParams),
    queryFn: () => itemApi.get.stockItemsWithStockLines(itemQueryParams),
    keepPreviousData: true,
  });

  const { data: coverageMasterListMembership } = useQuery({
    queryKey: ['daily-tally', 'coverage-master-list-membership', storeId],
    queryFn: async () => {
      const masterListsQuery = await masterListApi.masterList({
        storeId,
        filter: null,
      });

      const allMasterLists = masterListsQuery.masterLists.nodes ?? [];
      const childLists = allMasterLists.filter(list =>
        list.name.toLowerCase().includes('child')
      );
      const womenLists = allMasterLists.filter(list =>
        list.name.toLowerCase().includes('women')
      );

      const [childLineResults, womenLineResults] = await Promise.all([
        Promise.all(
          childLists.map(list =>
            masterListApi.masterListLines({
              storeId,
              masterListId: list.id,
              page: { first: 5000, offset: 0 },
            })
          )
        ),
        Promise.all(
          womenLists.map(list =>
            masterListApi.masterListLines({
              storeId,
              masterListId: list.id,
              page: { first: 5000, offset: 0 },
            })
          )
        ),
      ]);

      const childItemIds = new Set<string>();
      for (const query of childLineResults) {
        for (const line of query.masterListLines.nodes ?? []) {
          childItemIds.add(line.item.id);
        }
      }

      const womenItemIds = new Set<string>();
      for (const query of womenLineResults) {
        for (const line of query.masterListLines.nodes ?? []) {
          womenItemIds.add(line.item.id);
        }
      }

      return {
        childItemIds: Array.from(childItemIds),
        womenItemIds: Array.from(womenItemIds),
      };
    },
    keepPreviousData: true,
  });

  const { data: vaccineCourseLookup } = useQuery({
    queryKey: ['daily-tally', 'vaccine-course-doses'],
    queryFn: async () => {
      const result = await gqlClient.request<{
        vaccineCourses: {
          nodes: Array<{
            name?: string | null;
            vaccineCourseItems?: Array<{ itemId: string }> | null;
            vaccineCourseDoses?: Array<{ id: string; label: string }> | null;
          }>;
        };
      }, Record<string, never>>(`
        query dailyTallyVaccineCourses {
          vaccineCourses(
            sort: { key: name }
            page: { first: 1000 }
          ) {
            ... on VaccineCourseConnector {
              nodes {
                name
                vaccineCourseItems { itemId }
                vaccineCourseDoses { id label }
              }
            }
          }
        }
      `);
      const courses = result.vaccineCourses?.nodes ?? [];
      const dosesByItemId: Record<string, VaccineCourseDose[]> = {};
      const courseNameByItemId: Record<string, string> = {};
      for (const course of courses) {
        const items = course.vaccineCourseItems ?? [];
        const doses = (course.vaccineCourseDoses ?? []).filter(d => d.label);
        for (const item of items) {
          if (doses.length > 0 && !dosesByItemId[item.itemId]) {
            dosesByItemId[item.itemId] = doses;
          }
          if (!courseNameByItemId[item.itemId] && course.name) {
            courseNameByItemId[item.itemId] = course.name;
          }
        }
      }
      return {
        dosesByItemId,
        courseNameByItemId,
      };
    },
    keepPreviousData: true,
  });

  const dosesForItemId = vaccineCourseLookup?.dosesByItemId;
  const courseNameByItemId = vaccineCourseLookup?.courseNameByItemId;

  const groupedItems = useMemo((): ItemGroup[] => {
    return (data?.nodes ?? [])
      .map(item => {
        const stockLines = item.availableBatches.nodes.map(stockLine => ({
          id: stockLine.id,
          batch: stockLine.batch,
          expiryDate: stockLine.expiryDate,
          availableNumberOfPacks: toNumeric(stockLine.availableNumberOfPacks),
          packSize: stockLine.packSize,
        }));

        const sohPacks = stockLines.reduce(
          (total, stockLine) => total + stockLine.availableNumberOfPacks,
          0
        );

        return {
          itemId: item.id,
          name: item.name,
          unitName: item.unitName || 'Units',
          isVaccine: item.isVaccine,
          doses: item.doses,
          sohPacks,
          stockLines,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.nodes]);

  const coverageTemplate = useMemo(
    () => mapFixedDemographicGroups(demographicData?.nodes),
    [demographicData?.nodes]
  );

  useEffect(() => {
    setCoverageByItem(previous => {
      const next = { ...previous };
      for (const item of groupedItems) {
        if (!item.isVaccine) continue;

        const current = next[item.itemId];
        const childById = new Map(
          (current?.childAgeGroups ?? []).map(group => [group.id, group])
        );
        const womenById = new Map(
          (current?.womenAgeGroups ?? []).map(group => [group.id, group])
        );

        next[item.itemId] = {
          isOpen: current?.isOpen ?? false,
          childAgeGroups: coverageTemplate.childAgeGroups.map(group => {
            const existing = childById.get(group.id);
            return {
              ...group,
              male: existing?.male ?? 0,
              female: existing?.female ?? 0,
            };
          }),
          womenAgeGroups: coverageTemplate.womenAgeGroups.map(group => {
            const existing = womenById.get(group.id);
            return {
              ...group,
              count: existing?.count ?? 0,
            };
          }),
        };
      }
      return next;
    });
  }, [coverageTemplate, groupedItems]);

  useEffect(() => {
    if (!dosesForItemId) return;
    setPerDoseCoverageByItem(previous => {
      const next = { ...previous };
      for (const item of groupedItems) {
        if (!item.isVaccine) continue;
        const doses = dosesForItemId[item.itemId];
        if (!doses || doses.length === 0) continue;

        const existingItemDoses = next[item.itemId] ?? {};
        const nextItemDoses: Record<string, VaccineCoverageDraft> = {};

        for (const dose of doses) {
          const existing = existingItemDoses[dose.id];
          const childById = new Map(
            (existing?.childAgeGroups ?? []).map(g => [g.id, g])
          );
          const womenById = new Map(
            (existing?.womenAgeGroups ?? []).map(g => [g.id, g])
          );
          nextItemDoses[dose.id] = {
            isOpen: existing?.isOpen ?? false,
            childAgeGroups: coverageTemplate.childAgeGroups.map(group => {
              const e = childById.get(group.id);
              return { ...group, male: e?.male ?? 0, female: e?.female ?? 0 };
            }),
            womenAgeGroups: coverageTemplate.womenAgeGroups.map(group => {
              const e = womenById.get(group.id);
              return { ...group, count: e?.count ?? 0 };
            }),
          };
        }

        next[item.itemId] = nextItemDoses;
      }
      return next;
    });
  }, [coverageTemplate, groupedItems, dosesForItemId]);

  useEffect(() => {
    coverageByItemRef.current = coverageByItem;
  }, [coverageByItem]);

  useEffect(() => {
    perDoseCoverageByItemRef.current = perDoseCoverageByItem;
  }, [perDoseCoverageByItem]);

  useEffect(() => {
    setDraftByItem(previous => {
      const next = { ...previous };
      for (const item of groupedItems) {
        if (!next[item.itemId]) {
          next[item.itemId] = {
            used: 0,
            wastage: 0,
            openVialWastage: false,
            batchDraftById:
              item.stockLines.length > 1
                ? item.stockLines.reduce<Record<string, BatchDraft>>((acc, line) => {
                    acc[line.id] = {
                      used: 0,
                      wastage: 0,
                      openVialWastage: false,
                    };
                    return acc;
                  }, {})
                : undefined,
          };
        } else if (item.stockLines.length > 1) {
          const currentDraft = next[item.itemId] ?? {
            used: 0,
            wastage: 0,
            openVialWastage: false,
          };
          const existing = currentDraft.batchDraftById ?? {};
          const merged = { ...existing };
          for (const line of item.stockLines) {
            if (!merged[line.id]) {
              merged[line.id] = {
                used: 0,
                wastage: 0,
                openVialWastage: false,
              };
            } else if (!item.isVaccine) {
              const existingBatch = merged[line.id];
              merged[line.id] = {
                used: existingBatch?.used ?? 0,
                openVialWastage: false,
                wastage: 0,
              };
            }
          }
          next[item.itemId] = {
            used: currentDraft.used,
            wastage: currentDraft.wastage,
            openVialWastage: item.isVaccine ? currentDraft.openVialWastage : false,
            batchDraftById: merged,
          };
        }
      }
      return next;
    });
  }, [groupedItems]);

  useEffect(() => {
    setSessionTallyByItem(previous => {
      const next = { ...previous };

      for (const item of groupedItems) {
        if (!item.isVaccine) continue;
        if (!next[item.itemId]) {
          next[item.itemId] = createEmptySessionTallyDraft();
        }
      }

      return next;
    });
  }, [groupedItems]);

  const rows = useMemo((): DailyTallyRow[] => {
    return groupedItems.map(item => {
      const draft = draftByItem[item.itemId] || {
        used: 0,
        wastage: 0,
        openVialWastage: false,
      };
      const isMultiBatch = item.stockLines.length > 1;
      const sohDisplay = toDisplayUnits(item.sohPacks, item.isVaccine, item.doses);
      const batchWastage = sumBatchDraft(draft.batchDraftById, 'wastage');
      const effectiveWastage = isMultiBatch
        ? batchWastage > 0
          ? batchWastage
          : draft.wastage
        : draft.wastage;
      const remaining = round(sohDisplay - draft.used - effectiveWastage);

      return {
        itemId: item.itemId,
        item: item.name,
        soh: sohDisplay,
        used: draft.used,
        units: item.isVaccine ? t('label.doses') : item.unitName,
        openVialWastage: draft.openVialWastage,
        wastage: effectiveWastage,
        remainingStock: remaining,
        isVaccine: item.isVaccine,
        doses: item.doses,
        stockLines: item.stockLines,
        batchDraftById: draft.batchDraftById,
      };
    });
  }, [draftByItem, groupedItems, t]);

  const vaccineRows = useMemo(() => rows.filter(row => row.isVaccine), [rows]);
  const nonVaccineRows = useMemo(() => rows.filter(row => !row.isVaccine), [rows]);
  const hasAnyIssuedVaccineRows = useMemo(
    () => vaccineRows.some(row => row.used > 0),
    [vaccineRows]
  );
  const coverageFieldVisibilityByItem = useMemo(
    () => {
      const childItemIds = new Set(coverageMasterListMembership?.childItemIds ?? []);
      const womenItemIds = new Set(coverageMasterListMembership?.womenItemIds ?? []);

      return Object.fromEntries(
        vaccineRows.map(row => [
          row.itemId,
          {
            showChild: childItemIds.has(row.itemId),
            showWomen: womenItemIds.has(row.itemId),
          },
        ])
      ) as Record<string, CoverageFieldVisibility>;
    },
    [vaccineRows, coverageMasterListMembership]
  );
  const normalizedFilterText = filterText.trim().toLowerCase();
  const filteredVaccineRows = vaccineRows;

  const courseItemSelectionCandidates = useMemo((): CourseItemSelectionCandidate[] => {
    const groupedByCourse: Record<string, CourseItemSelectionCandidate> = {};

    for (const row of vaccineRows) {
      if (row.soh <= 0) continue;
      const courseName = courseNameByItemId?.[row.itemId] ?? row.item;
      if (!groupedByCourse[courseName]) {
        groupedByCourse[courseName] = {
          courseName,
          items: [],
        };
      }
      groupedByCourse[courseName].items.push({
        itemId: row.itemId,
        itemName: row.item,
        soh: row.soh,
      });
    }

    return Object.values(groupedByCourse)
      .filter(group => group.items.length > 1)
      .sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [courseNameByItemId, vaccineRows]);

  const hasCourseItemSelectionStep =
    !isSimplifiedMode && courseItemSelectionCandidates.length > 0;

  const courseItemSelectionCandidateByCourseName = useMemo(
    () =>
      Object.fromEntries(
        courseItemSelectionCandidates.map(candidate => [
          candidate.courseName,
          candidate,
        ])
      ) as Record<string, CourseItemSelectionCandidate>,
    [courseItemSelectionCandidates]
  );

  const hasValidCourseItemSelections = useMemo(
    () =>
      courseItemSelectionCandidates.every(candidate => {
        const selectedItemIds = selectedCourseItemIdsByCourse[candidate.courseName] ?? [];
        return selectedItemIds.length > 0;
      }),
    [courseItemSelectionCandidates, selectedCourseItemIdsByCourse]
  );

  useEffect(() => {
    const firstVaccineRow = vaccineRows[0];
    if (vaccineRows.length === 0) {
      if (selectedTallyItemId !== null) setSelectedTallyItemId(null);
      return;
    }

    if (!firstVaccineRow) return;

    if (!selectedTallyItemId) {
      setSelectedTallyItemId(firstVaccineRow.itemId);
      return;
    }

    const selectedExists = vaccineRows.some(row => row.itemId === selectedTallyItemId);
    if (!selectedExists) {
      setSelectedTallyItemId(firstVaccineRow.itemId);
    }
  }, [selectedTallyItemId, vaccineRows]);

  useEffect(() => {
    setSelectedCourseItemIdsByCourse(previous => {
      const next: Record<string, string[]> = {};
      for (const candidate of courseItemSelectionCandidates) {
        const validItemIds = new Set(candidate.items.map(item => item.itemId));
        next[candidate.courseName] = (previous[candidate.courseName] ?? []).filter(
          itemId => validItemIds.has(itemId)
        );
      }
      return next;
    });
  }, [courseItemSelectionCandidates]);

  const baseAllocationVaccineRows = useMemo(
    () =>
      isSimplifiedMode
        ? filteredVaccineRows
        : filteredVaccineRows.filter(row =>
            hasVisibleCoverageValues(
              coverageByItem[row.itemId],
              coverageFieldVisibilityByItem[row.itemId] ?? {
                showChild: false,
                showWomen: false,
              }
            )
          ),
    [isSimplifiedMode, filteredVaccineRows, coverageByItem, coverageFieldVisibilityByItem]
  );
  const allocationVaccineRows = useMemo(() => {
    if (!hasCourseItemSelectionStep) return baseAllocationVaccineRows;

    return baseAllocationVaccineRows.filter(row => {
      const courseName = courseNameByItemId?.[row.itemId] ?? row.item;
      const candidate = courseItemSelectionCandidateByCourseName[courseName];
      if (!candidate) return true;
      const selectedItemIds = selectedCourseItemIdsByCourse[courseName] ?? [];
      return selectedItemIds.includes(row.itemId);
    });
  }, [
    baseAllocationVaccineRows,
    hasCourseItemSelectionStep,
    courseNameByItemId,
    courseItemSelectionCandidateByCourseName,
    selectedCourseItemIdsByCourse,
  ]);
  const allocationNonVaccineRows = nonVaccineRows;
  const hasNonVaccineItems = allocationNonVaccineRows.length > 0;
  const isBaseThreeStepFlow =
    isSimplifiedMode && !isSessionTallyStepEnabled && hasNonVaccineItems;
  const workflowStepSequence = useMemo(() => {
    const sequence: WorkflowStep[] = [];
    if (isSessionTallyStepEnabled) sequence.push('tally');
    if (!isSimplifiedMode) sequence.push('coverage');
    if (hasCourseItemSelectionStep) sequence.push('course-items');
    sequence.push('allocation');
    sequence.push('wastage');
    if (hasNonVaccineItems) sequence.push('non-vaccine');
    return sequence;
  }, [
    hasNonVaccineItems,
    hasCourseItemSelectionStep,
    isSessionTallyStepEnabled,
    isSimplifiedMode,
  ]);

  const hasAnyCoveredMultiBatchVaccines = vaccineRows.some(
    row =>
      row.stockLines.length > 1 &&
      hasVisibleCoverageValues(
        coverageByItem[row.itemId],
        coverageFieldVisibilityByItem[row.itemId] ?? {
          showChild: false,
          showWomen: false,
        }
      )
  );
  const hasAnyCoverageValues = vaccineRows.some(row =>
    hasVisibleCoverageValues(
      coverageByItem[row.itemId],
      coverageFieldVisibilityByItem[row.itemId] ?? {
        showChild: false,
        showWomen: false,
      }
    )
  );
  const shouldCollapseAllocationStepInTitle =
    !isSimplifiedMode &&
    workflowStep !== 'allocation' &&
    workflowStepSequence.includes('allocation') &&
    !hasAnyCoveredMultiBatchVaccines;
  const shouldCollapseWastageStepInFourStepTitle =
    !isSimplifiedMode &&
    !hasAnyCoverageValues &&
    (workflowStep === 'coverage' || workflowStep === 'non-vaccine');
  const workflowDisplayStepSequence = workflowStepSequence.filter(step => {
    if (shouldCollapseAllocationStepInTitle && step === 'allocation') return false;
    if (isBaseThreeStepFlow && !hasAnyIssuedVaccineRows && step === 'wastage')
      return false;
    if (shouldCollapseWastageStepInFourStepTitle && step === 'wastage') return false;
    return true;
  });

  const workflowStepIndex = Math.max(workflowDisplayStepSequence.indexOf(workflowStep), 0);
  const workflowStepTotal = workflowDisplayStepSequence.length;
  const workflowStepTitleByKey: Record<WorkflowStep, string> = {
    tally: 'Live Counter',
    coverage: 'Coverage',
    'course-items': 'Course Items',
    allocation: keepTopRightButtonTextVisible
      ? 'Vaccine batches'
      : 'Vaccine Batch Allocation',
    wastage: 'Open Vial Wastage',
    'non-vaccine': 'Non-vaccine Issuance',
  };
  const workflowStepBreadcrumbLabel = `Step ${workflowStepIndex + 1} of ${workflowStepTotal}: ${workflowStepTitleByKey[workflowStep]}`;
  const allocationStepRows = useSimplifiedMobileUi
    ? allocationVaccineRows
    : allocationVaccineRows.filter(row => row.stockLines.length > 1);
  const displayedVaccineRows =
    workflowStep === 'coverage'
      ? []
      : workflowStep === 'allocation'
        ? allocationStepRows
        : workflowStep === 'wastage'
        ? useSimplifiedMobileUi
          ? allocationVaccineRows.filter(row => row.used > 0)
          : allocationVaccineRows
        : [];

  useEffect(() => {
    if (!workflowStepSequence.includes(workflowStep)) {
      setWorkflowStep(workflowStepSequence[0] ?? 'allocation');
    }
  }, [workflowStep, workflowStepSequence]);
  const coverageExceedsSohRows = useMemo(
    () =>
      vaccineRows
        .map(row => {
          const coverage = coverageByItem[row.itemId];
          const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
            showChild: false,
            showWomen: false,
          };
          if (!coverage || !hasVisibleCoverageValues(coverage, visibility)) return null;

          const coverageTotal = getVisibleCoverageUsedTotal(coverage, visibility);
          if (coverageTotal - row.soh <= 0.0001) return null;

          return {
            itemId: row.itemId,
            item: row.item,
            coverageTotal,
            soh: row.soh,
          };
        })
        .filter(
          (
            row
          ): row is { itemId: string; item: string; coverageTotal: number; soh: number } =>
            row !== null
        ),
    [vaccineRows, coverageByItem, coverageFieldVisibilityByItem]
  );
  const coverageExceedsSohByItem = useMemo(
    () =>
      Object.fromEntries(
        coverageExceedsSohRows.map(row => [
          row.itemId,
          { coverageTotal: row.coverageTotal, soh: row.soh },
        ])
      ),
    [coverageExceedsSohRows]
  );
  const confirmCoverageRows = useMemo(
    () =>
      buildCoverageSummaryRows(
        rows.filter(row => row.isVaccine && row.used > 0),
        coverageByItem,
        demographicData?.nodes,
        coverageFieldVisibilityByItem,
        perDoseCoverageByItem,
        dosesForItemId
      ),
    [
      rows,
      coverageByItem,
      demographicData?.nodes,
      coverageFieldVisibilityByItem,
      perDoseCoverageByItem,
      dosesForItemId,
    ]
  );
  const childCoverageSummaryRows = useMemo(
    () =>
      confirmCoverageRows.filter(row => {
        const childTotal =
          row.childUnderOneMale +
          row.childUnderOneFemale +
          row.childOneToTwoMale +
          row.childOneToTwoFemale +
          row.childTwoToFiveMale +
          row.childTwoToFiveFemale;
        return childTotal > 0;
      }),
    [confirmCoverageRows]
  );
  const womenCoverageSummaryRows = useMemo(
    () =>
      confirmCoverageRows.filter(
        row => row.womenPregnant + row.womenNonPregnant > 0
      ),
    [confirmCoverageRows]
  );

  useEffect(() => {
    setCustomBreadcrumbs({
      0: 'Daily tally',
      1: workflowStepBreadcrumbLabel,
    });
  }, [setCustomBreadcrumbs, workflowStepBreadcrumbLabel]);

  const syncCoverageFromSessionTally = (
    row: DailyTallyRow,
    draft: VaccineSessionTallyDraft,
    doseId?: string
  ) => {
    if (isSimplifiedMode) return;

    const currentCoverage =
      coverageByItemRef.current[row.itemId] ?? defaultVaccineCoverageDraft(coverageTemplate);
    const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
      showChild: false,
      showWomen: false,
    };
    const isWomenOnly = visibility.showWomen && !visibility.showChild;
    const womenTotals = {
      nonPregnant:
        draft.counts[womenNonPregnantTallyKey].male +
        draft.counts[womenNonPregnantTallyKey].female,
      pregnant:
        draft.counts[womenPregnantTallyKey].male +
        draft.counts[womenPregnantTallyKey].female,
    };
    const { nonPregnantGroup, pregnantGroup } = resolveWomenCoverageGroups(
      currentCoverage.womenAgeGroups
    );
    const womenBaseLabel = womenCoverageLabel(nonPregnantGroup, pregnantGroup);

    const nextCoverage: VaccineCoverageDraft = {
      ...currentCoverage,
      childAgeGroups: currentCoverage.childAgeGroups.map((group, index) => {
        const mappedAgeKey = tallyAgeKeyByIndex[index];
        if (!mappedAgeKey) return group;

        if (!visibility.showChild || isWomenOnly) {
          return {
            ...group,
            male: 0,
            female: 0,
          };
        }

        return {
          ...group,
          male: draft.counts[mappedAgeKey].male,
          female: draft.counts[mappedAgeKey].female,
        };
      }),
      womenAgeGroups: (() => {
        if (!isWomenOnly) {
          return currentCoverage.womenAgeGroups.map(group => ({
            ...group,
            count: 0,
          }));
        }

        const nextGroups = currentCoverage.womenAgeGroups.map(group => {
          if (group.id === nonPregnantGroup?.id) {
            return { ...group, count: womenTotals.nonPregnant };
          }
          if (group.id === pregnantGroup?.id) {
            return { ...group, count: womenTotals.pregnant };
          }
          return { ...group, count: 0 };
        });

        if (!nonPregnantGroup && womenTotals.nonPregnant > 0) {
          nextGroups.push({
            id: pregnantGroup?.id
              ? `${pregnantGroup.id}-non-pregnant`
              : 'women-non-pregnant',
            label:
              womenBaseLabel === 'Women'
                ? 'Women - Non pregnant'
                : `${womenBaseLabel} - Non pregnant`,
            count: womenTotals.nonPregnant,
          });
        }

        if (!pregnantGroup && womenTotals.pregnant > 0) {
          nextGroups.push({
            id: nonPregnantGroup?.id
              ? `${nonPregnantGroup.id}-pregnant`
              : 'women-pregnant',
            label:
              womenBaseLabel === 'Women'
                ? 'Women - Pregnant'
                : `${womenBaseLabel} - Pregnant`,
            count: womenTotals.pregnant,
          });
        }

        return nextGroups;
      })(),
    };

    const itemDoses = dosesForItemId?.[row.itemId] ?? [];
    const isDoseScoped = Boolean(doseId) && itemDoses.length > 0;

    if (isDoseScoped && doseId) {
      const currentPerDose = perDoseCoverageByItemRef.current[row.itemId] ?? {};
      const nextPerDose = {
        ...currentPerDose,
        [doseId]: nextCoverage,
      };

      perDoseCoverageByItemRef.current = {
        ...perDoseCoverageByItemRef.current,
        [row.itemId]: nextPerDose,
      };
      setPerDoseCoverageByItem(previous => ({
        ...previous,
        [row.itemId]: nextPerDose,
      }));

      const aggregateCoverage = computeAggregateCoverage(
        nextPerDose,
        defaultVaccineCoverageDraft(coverageTemplate)
      );

      coverageByItemRef.current = {
        ...coverageByItemRef.current,
        [row.itemId]: aggregateCoverage,
      };

      setCoverageByItem(previous => ({
        ...previous,
        [row.itemId]: aggregateCoverage,
      }));
      return;
    }

    coverageByItemRef.current = {
      ...coverageByItemRef.current,
      [row.itemId]: nextCoverage,
    };

    setCoverageByItem(previous => ({
      ...previous,
      [row.itemId]: nextCoverage,
    }));
  };

  const updateSessionTallyCell = (
    row: DailyTallyRow,
    ageKey: TallyAgeKey,
    genderKey: TallyGenderKey,
    delta: 1 | -1,
    selectedDoseId?: string
  ) => {
    setSessionTallyByItem(previous => {
      const itemDoses = dosesForItemId?.[row.itemId] ?? [];
      const sessionKey =
        itemDoses.length > 0
          ? getSessionTallyKey(row.itemId, selectedDoseId)
          : getSessionTallyKey(row.itemId);
      const currentDraft = previous[sessionKey] ?? createEmptySessionTallyDraft();
      const currentValue = currentDraft.counts[ageKey][genderKey] ?? 0;
      const nextValue = Math.max(0, currentValue + delta);

      const nextDraft: VaccineSessionTallyDraft = {
        counts: {
          ...currentDraft.counts,
          [ageKey]: {
            ...currentDraft.counts[ageKey],
            [genderKey]: nextValue,
          },
        },
      };

      const nextSessionTallyByKey = {
        ...previous,
        [sessionKey]: nextDraft,
      };

      applyUsedValue(
        row,
        getSessionTallyVaccineTotalForItem(nextSessionTallyByKey, row, itemDoses)
      );
      syncCoverageFromSessionTally(row, nextDraft, selectedDoseId);

      return nextSessionTallyByKey;
    });
  };

  const getTallyCategoryOptionsForRow = (
    row: DailyTallyRow
  ): Array<{ key: TallyAgeKey; label: string }> => {
    const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
      showChild: false,
      showWomen: false,
    };
    const isWomenOnly = visibility.showWomen && !visibility.showChild;

    if (!isWomenOnly) return tallyAgeGroups;

    return [
      {
        key: womenNonPregnantTallyKey,
        label: 'Non-pregnant',
      },
      {
        key: womenPregnantTallyKey,
        label: 'Pregnant',
      },
    ];
  };

  const getWomenBaseLabelForRow = (row: DailyTallyRow) => {
    const womenGroups =
      (coverageByItem[row.itemId] ?? defaultVaccineCoverageDraft(coverageTemplate)).womenAgeGroups;
    const { nonPregnantGroup, pregnantGroup } = resolveWomenCoverageGroups(womenGroups);

    return womenCoverageLabel(nonPregnantGroup, pregnantGroup);
  };

  const getEffectiveTallySelectionForRow = (row: DailyTallyRow) => {
    const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
      showChild: false,
      showWomen: false,
    };
    const isWomenOnly = visibility.showWomen && !visibility.showChild;
    const categoryOptions = getTallyCategoryOptionsForRow(row);
    const hasActiveAge = categoryOptions.some(option => option.key === activeTallyAge);
    const effectiveAgeKey = hasActiveAge
      ? activeTallyAge
      : (categoryOptions[0]?.key ?? 'under1');

    return {
      isWomenOnly,
      categoryOptions,
      effectiveAgeKey,
      effectiveGenderKey: isWomenOnly ? ('female' as const) : activeTallyGender,
    };
  };

  const incrementFocusedTallyCell = (row: DailyTallyRow) => {
    const { effectiveAgeKey, effectiveGenderKey } = getEffectiveTallySelectionForRow(row);

    if (showTallyTapHint) setShowTallyTapHint(false);
    updateSessionTallyCell(
      row,
      effectiveAgeKey,
      effectiveGenderKey,
      1,
      selectedDoseIdByItem[row.itemId]
    );
    setTallyTapHistory(previous => [
      ...previous,
      {
        itemId: row.itemId,
        ageKey: effectiveAgeKey,
        genderKey: effectiveGenderKey,
        doseId: selectedDoseIdByItem[row.itemId],
      },
    ]);
  };

  const undoLastTallyTap = (row: DailyTallyRow) => {
    const { effectiveAgeKey, effectiveGenderKey } = getEffectiveTallySelectionForRow(row);

    const matchingActionIndex = tallyTapHistory
      .map((action, index) => ({ action, index }))
      .reverse()
      .find(
        ({ action }) =>
          action.itemId === row.itemId &&
          action.ageKey === effectiveAgeKey &&
          action.genderKey === effectiveGenderKey &&
          (action.doseId ?? '') === (selectedDoseIdByItem[row.itemId] ?? '')
      )?.index;

    if (matchingActionIndex === undefined) return;

    const matchingAction = tallyTapHistory[matchingActionIndex];
    if (!matchingAction) return;

    const currentValue =
      sessionTallyByItem[
        getSessionTallyKey(row.itemId, matchingAction.doseId)
      ]?.counts[matchingAction.ageKey]?.[
        matchingAction.genderKey
      ] ?? 0;
    if (currentValue <= 0) {
      setTallyTapHistory(previous =>
        previous.filter((_, index) => index !== matchingActionIndex)
      );
      return;
    }

    updateSessionTallyCell(
      row,
      matchingAction.ageKey,
      matchingAction.genderKey,
      -1,
      matchingAction.doseId
    );
    setTallyTapHistory(previous =>
      previous.filter((_, index) => index !== matchingActionIndex)
    );
  };

  const toggleCourseItemSelection = (courseName: string, itemId: string) => {
    setSelectedCourseItemIdsByCourse(previous => {
      const selected = previous[courseName] ?? [];
      const isSelected = selected.includes(itemId);
      return {
        ...previous,
        [courseName]: isSelected
          ? selected.filter(currentItemId => currentItemId !== itemId)
          : [...selected, itemId],
      };
    });
  };

  const moveToAllocationStep = () => {
    // If coverage is entirely empty (all zeros), skip allocation and wastage.
    const hasAnyCoverageValues = vaccineRows.some(row =>
      hasVisibleCoverageValues(
        coverageByItem[row.itemId],
        coverageFieldVisibilityByItem[row.itemId] ?? {
          showChild: false,
          showWomen: false,
        }
      )
    );
    if (!hasAnyCoverageValues) {
      const allocationIndex = workflowStepSequence.indexOf('allocation');
      const stepAfterAllocation =
        allocationIndex >= 0 ? workflowStepSequence[allocationIndex + 1] : undefined;
      const wastageIndex = workflowStepSequence.indexOf('wastage');
      const stepAfterVaccineSteps =
        wastageIndex >= 0 ? workflowStepSequence[wastageIndex + 1] : stepAfterAllocation;

      if (stepAfterVaccineSteps === 'non-vaccine') {
        moveToNonVaccineStep();
        return;
      }

      if (stepAfterVaccineSteps) {
        setWorkflowStep(stepAfterVaccineSteps);
        return;
      }

      onConfirm();
      return;
    }

    if (coverageExceedsSohRows.length > 0) {
      const summary = coverageExceedsSohRows
        .slice(0, 3)
        .map(row => `${row.item} (${row.coverageTotal} > SOH ${row.soh})`)
        .join('; ');
      const remainingCount = coverageExceedsSohRows.length - 3;

      error(
        `Cannot continue to Batches because coverage exceeds stock on hand for: ${summary}${remainingCount > 0 ? `; and ${remainingCount} more item(s)` : ''}. Reduce coverage totals so they are <= SOH.`
      )();
      return;
    }

    // If covered vaccine rows are all single-batch, skip allocation and go straight to wastage.
    const hasAnyCoveredMultiBatchVaccines = vaccineRows.some(
      row =>
        row.stockLines.length > 1 &&
        hasVisibleCoverageValues(
          coverageByItem[row.itemId],
          coverageFieldVisibilityByItem[row.itemId] ?? {
            showChild: false,
            showWomen: false,
          }
        )
    );
    if (!hasAnyCoveredMultiBatchVaccines) {
      setWorkflowStep('wastage');
      return;
    }

    setWorkflowStep(hasCourseItemSelectionStep ? 'course-items' : 'allocation');
  };

  const ensureMultiBatchAllocationIsValid = () => {
    const usedVaccineRows = allocationVaccineRows.filter(row => row.used > 0);

    const invalidMultiBatchUsed = usedVaccineRows.find(row => {
      if (row.stockLines.length <= 1) return false;
      const batchDraftById = draftByItem[row.itemId]?.batchDraftById;
      const batchUsedTotal = sumBatchDraft(batchDraftById, 'used');
      const hasAnyBatchUsed = Object.values(batchDraftById ?? {}).some(
        batch => (batch?.used ?? 0) > 0
      );

      return !hasAnyBatchUsed || Math.abs(batchUsedTotal - row.used) > 0.0001;
    });

    if (invalidMultiBatchUsed) {
      error(
        `For ${invalidMultiBatchUsed.item}, batch Issued is mandatory and must equal item Issued.`
      )();
      return false;
    }

    const invalidMultiBatchCapacity = usedVaccineRows.find(row => {
      if (row.stockLines.length <= 1) return false;
      const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};

      return row.stockLines.some(stockLine => {
        const batchUsed = batchDraftById[stockLine.id]?.used ?? 0;
        const availableDisplay = toDisplayUnits(
          stockLine.availableNumberOfPacks,
          row.isVaccine,
          row.doses
        );
        return batchUsed - availableDisplay > 0.0001;
      });
    });

    if (invalidMultiBatchCapacity) {
      error(
        `For ${invalidMultiBatchCapacity.item}, one or more batch Issued values exceed that batch stock.`
      )();
      return false;
    }

    return true;
  };

  const ensureSimplifiedMobileIssuedWithinSoh = () => {
    if (!useSimplifiedMobileUi || workflowStep !== 'allocation') return true;

    const invalidRows = allocationVaccineRows.filter(row => row.used - row.soh > 0.0001);
    if (invalidRows.length === 0) return true;

    const summary = invalidRows
      .slice(0, 3)
      .map(row => `${row.item} (Issued ${row.used} > SOH ${row.soh})`)
      .join('; ');
    const remainingCount = invalidRows.length - 3;

    error(
      `Cannot continue to Open Vial Wastage because Issued exceeds SOH for: ${summary}${remainingCount > 0 ? `; and ${remainingCount} more item(s)` : ''}.`
    )();
    return false;
  };

  const moveToWastageStep = () => {
    if (!ensureSimplifiedMobileIssuedWithinSoh()) return;
    if (!ensureMultiBatchAllocationIsValid()) return;

    if (isBaseThreeStepFlow && !hasAnyIssuedVaccineRows) {
      setWorkflowStep('non-vaccine');
      return;
    }

    setWorkflowStep('wastage');
  };

  const moveToNonVaccineStep = () => {
    if (!ensureMultiBatchAllocationIsValid()) return;

    setWorkflowStep('non-vaccine');
  };

  const moveToNextWorkflowStep = () => {
    const currentIndex = workflowStepSequence.indexOf(workflowStep);
    const nextStep = workflowStepSequence[currentIndex + 1];

    if (workflowStep === 'tally') {
      if (nextStep) setWorkflowStep(nextStep);
      else onConfirm();
      return;
    }

    if (workflowStep === 'coverage') {
      moveToAllocationStep();
      return;
    }

    if (workflowStep === 'course-items') {
      if (!hasValidCourseItemSelections) {
        error('Select at least one item for each vaccine course before continuing to Batches.')();
        return;
      }
      setWorkflowStep('allocation');
      return;
    }

    if (workflowStep === 'allocation') {
      moveToWastageStep();
      return;
    }

    if (workflowStep === 'wastage') {
      if (nextStep === 'non-vaccine') {
        moveToNonVaccineStep();
        return;
      }
      onConfirm();
      return;
    }

    onConfirm();
  };

  const moveToPreviousWorkflowStep = () => {
    if (workflowStep === 'non-vaccine') {
      const isThreeStepFlow =
        workflowStepSequence.length === 3 &&
        workflowStepSequence[0] === 'allocation' &&
        workflowStepSequence[1] === 'wastage' &&
        workflowStepSequence[2] === 'non-vaccine';

      if (isThreeStepFlow) {
        setWorkflowStep(hasAnyIssuedVaccineRows ? 'wastage' : 'allocation');
        return;
      }

      const hasAnyCoverageValues = vaccineRows.some(row =>
        hasVisibleCoverageValues(
          coverageByItem[row.itemId],
          coverageFieldVisibilityByItem[row.itemId] ?? {
            showChild: false,
            showWomen: false,
          }
        )
      );

      if (!hasAnyCoverageValues) {
        if (workflowStepSequence.includes('coverage')) {
          setWorkflowStep('coverage');
          return;
        }

        const firstStep = workflowStepSequence[0];
        if (firstStep) {
          setWorkflowStep(firstStep);
          return;
        }
      }
    }

    if (workflowStep === 'wastage') {
      const hasAnyCoveredMultiBatchVaccines = vaccineRows.some(
        row =>
          row.stockLines.length > 1 &&
          hasVisibleCoverageValues(
            coverageByItem[row.itemId],
            coverageFieldVisibilityByItem[row.itemId] ?? {
              showChild: false,
              showWomen: false,
            }
          )
      );

      if (!hasAnyCoveredMultiBatchVaccines) {
        if (workflowStepSequence.includes('coverage')) {
          setWorkflowStep('coverage');
          return;
        }

        const firstStep = workflowStepSequence[0];
        if (firstStep) {
          setWorkflowStep(firstStep);
          return;
        }
      }
    }

    const currentIndex = workflowStepSequence.indexOf(workflowStep);
    const previousStep = workflowStepSequence[currentIndex - 1];
    if (previousStep) {
      setWorkflowStep(previousStep);
    }
  };

  const updateDraft = (itemId: string, patch: Partial<RowDraft>) => {
    setDraftByItem(previous => ({
      ...previous,
      [itemId]: {
        used: previous[itemId]?.used ?? 0,
        wastage: previous[itemId]?.wastage ?? 0,
        openVialWastage: previous[itemId]?.openVialWastage ?? false,
        batchDraftById: previous[itemId]?.batchDraftById,
        ...patch,
      },
    }));
  };

  const applyUsedValue = (row: DailyTallyRow, used: number) => {
    const nextUsed = round(used);

    if (row.stockLines.length > 1) {
      setDraftByItem(previous => {
        const rowDraft = previous[row.itemId] ?? {
          used: 0,
          wastage: 0,
          openVialWastage: false,
        };
        const existingBatchDraft = rowDraft.batchDraftById ?? {};
        const nextBatchDraftById = Object.fromEntries(
          row.stockLines.map(stockLine => {
            const existing = existingBatchDraft[stockLine.id] ?? {
              used: 0,
              wastage: 0,
              openVialWastage: false,
            };

            if (nextUsed <= 0) {
              return [
                stockLine.id,
                {
                  used: 0,
                  wastage: 0,
                  openVialWastage: false,
                },
              ];
            }

            return [
              stockLine.id,
              {
                ...existing,
                openVialWastage: existing.used > 0 ? existing.openVialWastage : false,
                wastage: existing.wastage,
              },
            ];
          })
        ) as Record<string, BatchDraft>;

        return {
          ...previous,
          [row.itemId]: {
            ...rowDraft,
            used: nextUsed,
            openVialWastage: nextUsed > 0 ? rowDraft.openVialWastage : false,
            wastage: sumBatchDraft(nextBatchDraftById, 'wastage'),
            batchDraftById: nextBatchDraftById,
          },
        };
      });
      return;
    }

    const nextRow = { ...row, used: nextUsed };
    const nextOpenVialWastage = nextUsed > 0 ? row.openVialWastage : false;
    const suggested = nextOpenVialWastage
      ? getSuggestedOpenVialWastage(nextRow)
      : null;

    updateDraft(row.itemId, {
      used: nextUsed,
      openVialWastage: nextOpenVialWastage,
      wastage: nextUsed > 0 ? row.wastage : suggested ?? 0,
    });
  };

  const updateUsed = (row: DailyTallyRow, rawValue: string) => {
    applyUsedValue(row, parseInput(rawValue));
  };

  const updateCoverageForRow = (
    row: DailyTallyRow,
    updater: (current: VaccineCoverageDraft) => VaccineCoverageDraft
  ) => {
    const currentCoverage =
      coverageByItemRef.current[row.itemId] ?? defaultVaccineCoverageDraft(coverageTemplate);
    const nextCoverage = updater(currentCoverage);

    coverageByItemRef.current = {
      ...coverageByItemRef.current,
      [row.itemId]: nextCoverage,
    };

    setCoverageByItem(previous => ({
      ...previous,
      [row.itemId]: nextCoverage,
    }));

    applyUsedValue(
      row,
      getVisibleCoverageUsedTotal(
        nextCoverage,
        coverageFieldVisibilityByItem[row.itemId] ?? {
          showChild: false,
          showWomen: false,
        }
      )
    );
  };

  const updateDoseCoverageForRow = (
    row: DailyTallyRow,
    doseId: string,
    updater: (current: VaccineCoverageDraft) => VaccineCoverageDraft
  ) => {
    const itemDoses = perDoseCoverageByItemRef.current[row.itemId] ?? {};
    const currentDoseCoverage =
      itemDoses[doseId] ?? defaultVaccineCoverageDraft(coverageTemplate);
    const nextDoseCoverage = updater(currentDoseCoverage);
    const nextItemDoses = { ...itemDoses, [doseId]: nextDoseCoverage };

    perDoseCoverageByItemRef.current = {
      ...perDoseCoverageByItemRef.current,
      [row.itemId]: nextItemDoses,
    };
    setPerDoseCoverageByItem(prev => ({ ...prev, [row.itemId]: nextItemDoses }));

    const aggregate = computeAggregateCoverage(
      nextItemDoses,
      defaultVaccineCoverageDraft(coverageTemplate)
    );

    coverageByItemRef.current = {
      ...coverageByItemRef.current,
      [row.itemId]: aggregate,
    };
    setCoverageByItem(prev => ({ ...prev, [row.itemId]: aggregate }));

    applyUsedValue(
      row,
      getVisibleCoverageUsedTotal(
        aggregate,
        coverageFieldVisibilityByItem[row.itemId] ?? {
          showChild: false,
          showWomen: false,
        }
      )
    );
  };

  const updateOpenVialWastage = (row: DailyTallyRow, checked: boolean) => {
    const nextChecked = row.isVaccine ? checked : false;
    const suggested = nextChecked ? getSuggestedOpenVialWastage(row) : null;

    updateDraft(row.itemId, {
      openVialWastage: nextChecked,
      ...(nextChecked ? {} : { wastage: 0 }),
      ...(nextChecked && suggested !== null ? { wastage: suggested } : {}),
    });
  };

  const batchSuggestion = (row: DailyTallyRow, stockOnHand: number, used: number) => {
    if (!row.isVaccine || row.doses <= 0 || used <= 0) return 0;

    return getSuggestedOpenVialWastageAmount({
      stockOnHand,
      used,
      doses: row.doses,
    });
  };

  const batchCalculatedWastage = (
    row: DailyTallyRow,
    stockLine: TallyStockLine,
    used: number,
    isOpenVialWastage: boolean
  ) => {
    if (!isOpenVialWastage) return 0;
    if (used <= 0) return 0;
    return batchSuggestion(
      row,
      toDisplayUnits(stockLine.availableNumberOfPacks, row.isVaccine, row.doses),
      used
    );
  };

  const updateBatchUsed = (
    row: DailyTallyRow,
    stockLine: TallyStockLine,
    rawValue: string
  ) => {
    const requestedUsed = parseInput(rawValue);
    const availableDisplay = toDisplayUnits(
      stockLine.availableNumberOfPacks,
      row.isVaccine,
      row.doses
    );
    const used = Math.min(requestedUsed, availableDisplay);

    if (requestedUsed - availableDisplay > 0.0001) {
      error(
        `Issued for batch ${batchLabel(stockLine)} cannot exceed available ${availableDisplay}.`
      )();
    }

    setDraftByItem(previous => {
      const rowDraft = previous[row.itemId] ?? {
        used: 0,
        wastage: 0,
        openVialWastage: false,
      };
      const batchDraftById = rowDraft.batchDraftById ?? {};
      const currentBatchDraft = batchDraftById[stockLine.id] ?? {
        used: 0,
        wastage: 0,
        openVialWastage: false,
      };

      const nextOpenVialWastage = used > 0 ? currentBatchDraft.openVialWastage : false;
      const suggested = nextOpenVialWastage
        ? batchSuggestion(
            row,
            toDisplayUnits(stockLine.availableNumberOfPacks, row.isVaccine, row.doses),
            used
          )
        : 0;

      const nextBatchDraftById = {
        ...batchDraftById,
        [stockLine.id]: {
          ...currentBatchDraft,
          used,
          openVialWastage: nextOpenVialWastage,
          wastage: used > 0 ? currentBatchDraft.wastage : suggested ?? 0,
        },
      };

      return {
        ...previous,
        [row.itemId]: {
          ...rowDraft,
          used: rowDraft.used,
          wastage: sumBatchDraft(nextBatchDraftById, 'wastage'),
          batchDraftById: nextBatchDraftById,
        },
      };
    });
  };

  const updateBatchOpenVialWastage = (
    row: DailyTallyRow,
    stockLine: TallyStockLine,
    checked: boolean
  ) => {
    setDraftByItem(previous => {
      const rowDraft = previous[row.itemId] ?? {
        used: 0,
        wastage: 0,
        openVialWastage: false,
      };
      const batchDraftById = rowDraft.batchDraftById ?? {};
      const currentBatchDraft = batchDraftById[stockLine.id] ?? {
        used: 0,
        wastage: 0,
        openVialWastage: false,
      };

      const nextChecked = row.isVaccine && currentBatchDraft.used > 0 ? checked : false;
      const nextWastage = nextChecked
        ? batchSuggestion(
            row,
            toDisplayUnits(stockLine.availableNumberOfPacks, row.isVaccine, row.doses),
            currentBatchDraft.used
          )
        : 0;

      const nextBatchDraftById = {
        ...batchDraftById,
        [stockLine.id]: {
          ...currentBatchDraft,
          openVialWastage: nextChecked,
          wastage: nextWastage,
        },
      };

      return {
        ...previous,
        [row.itemId]: {
          ...rowDraft,
          used: rowDraft.used,
          wastage: sumBatchDraft(nextBatchDraftById, 'wastage'),
          batchDraftById: nextBatchDraftById,
        },
      };
    });
  };

  const updateBatchWastage = (
    row: DailyTallyRow,
    stockLine: TallyStockLine,
    rawValue: string
  ) => {
    const wastage = parseInput(rawValue);
    setDraftByItem(previous => {
      const rowDraft = previous[row.itemId] ?? {
        used: 0,
        wastage: 0,
        openVialWastage: false,
      };
      const batchDraftById = rowDraft.batchDraftById ?? {};
      const currentBatchDraft = batchDraftById[stockLine.id] ?? {
        used: 0,
        wastage: 0,
        openVialWastage: false,
      };

      const nextBatchDraftById = {
        ...batchDraftById,
        [stockLine.id]: {
          ...currentBatchDraft,
          wastage,
        },
      };

      return {
        ...previous,
        [row.itemId]: {
          ...rowDraft,
          used: rowDraft.used,
          wastage: sumBatchDraft(nextBatchDraftById, 'wastage'),
          batchDraftById: nextBatchDraftById,
        },
      };
    });
  };

  const issuedBatchSummary = (row: DailyTallyRow) =>
    row.stockLines
      .filter(stockLine => (row.batchDraftById?.[stockLine.id]?.used ?? 0) > 0)
      .map(stockLine => {
        const used = row.batchDraftById?.[stockLine.id]?.used ?? 0;
        return `${batchLabel(stockLine)} (${used})`;
      })
      .join(', ');

  const buildConfirmationRows = (activeRows: DailyTallyRow[]) => {
    const summaryRows: ConfirmationSummaryRow[] = [];

    for (const row of activeRows) {
      const unitLabel = row.units.toLowerCase();

      if (row.stockLines.length > 1) {
        const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};
        for (const stockLine of row.stockLines) {
          const batchUsed = batchDraftById[stockLine.id]?.used ?? 0;
          const isOpen = batchDraftById[stockLine.id]?.openVialWastage ?? false;
          const batchWastage = row.isVaccine
            ? batchCalculatedWastage(row, stockLine, batchUsed, isOpen)
            : batchDraftById[stockLine.id]?.wastage ?? 0;
          if (batchUsed <= 0 && batchWastage <= 0) continue;

          summaryRows.push({
            item: row.item,
            batch: batchLabel(stockLine),
            issued: `${batchUsed} ${unitLabel}`,
            wastage: `${batchWastage} ${unitLabel}`,
          });
        }
        continue;
      }

      const usedPacks = toPacks(row.used, row.isVaccine, row.doses);
      const wastagePacks = toPacks(row.wastage, row.isVaccine, row.doses);
      const usedAllocations =
        row.used > 0
          ? allocateAcrossStockLines(row.stockLines, usedPacks).allocations
          : [];
      const wastageAllocations =
        row.wastage > 0
          ? allocateAcrossStockLines(row.stockLines, wastagePacks).allocations
          : [];

      const lineIds = new Set<string>([
        ...usedAllocations.map(a => a.stockLine.id),
        ...wastageAllocations.map(a => a.stockLine.id),
      ]);

      for (const stockLineId of lineIds) {
        const stockLine = row.stockLines.find(line => line.id === stockLineId);
        if (!stockLine) continue;

        const issuedPacks =
          usedAllocations.find(a => a.stockLine.id === stockLineId)?.packs ?? 0;
        const wastedPacks =
          wastageAllocations.find(a => a.stockLine.id === stockLineId)?.packs ?? 0;

        const issued = toDisplayUnits(issuedPacks, row.isVaccine, row.doses);
        const wasted = toDisplayUnits(wastedPacks, row.isVaccine, row.doses);

        if (issued <= 0 && wasted <= 0) continue;

        summaryRows.push({
          item: row.item,
          batch: batchLabel(stockLine),
          issued: `${issued} ${unitLabel}`,
          wastage: `${wasted} ${unitLabel}`,
        });
      }
    }

    return summaryRows;
  };

  const onConfirm = async (skipSummaryDialog = false, skipDuplicateWarning = false) => {
    let createdPrescriptionId: string | undefined;
    let createdStocktakeId: string | undefined;

    try {
      const activeRows = rows.filter(row => row.used > 0 || row.wastage > 0);
      if (!activeRows.length) {
        error('Enter issued or wastage values before confirming')();
        return;
      }

      const invalid = activeRows.find(
        row => row.used + row.wastage > row.soh || row.remainingStock < 0
      );
      if (invalid) {
        error(`Invalid input for ${invalid.item}: Issued + Wastage must be <= SOH`)();
        return;
      }

      const usedRows = activeRows.filter(row => row.used > 0);
      const wastageRows = activeRows.filter(row => row.wastage > 0);
      const vaccineRowsWithUse = usedRows.filter(row => row.isVaccine);
      const coverageSummary = coverageSummaryText(
        vaccineRowsWithUse,
        coverageByItem,
        coverageFieldVisibilityByItem
      );
      const vaccineWastageRows = wastageRows.filter(row => row.isVaccine);
      const nonVaccineWastageRows = wastageRows.filter(row => !row.isVaccine);

      const tooSmallUsedRow = usedRows.find(
        row => toPacks(row.used, row.isVaccine, row.doses) <= 0
      );
      if (tooSmallUsedRow) {
        error(`Issued value for ${tooSmallUsedRow.item} is too small to allocate stock lines.`)();
        return;
      }

      const missingStockLineRow = usedRows.find(row => row.stockLines.length === 0);
      if (missingStockLineRow) {
        error(`No stock lines available for ${missingStockLineRow.item}.`)();
        return;
      }

      const invalidMultiBatchUsed = usedRows.find(row => {
        if (row.stockLines.length <= 1) return false;
        const batchDraftById = draftByItem[row.itemId]?.batchDraftById;
        const batchUsedTotal = sumBatchDraft(batchDraftById, 'used');
        const hasAnyBatchUsed = Object.values(batchDraftById ?? {}).some(
          batch => (batch?.used ?? 0) > 0
        );

        return !hasAnyBatchUsed || Math.abs(batchUsedTotal - row.used) > 0.0001;
      });

      const invalidMultiBatchCapacity = usedRows.find(row => {
        if (row.stockLines.length <= 1) return false;
        const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};

        return row.stockLines.some(stockLine => {
          const batchUsed = batchDraftById[stockLine.id]?.used ?? 0;
          const availableDisplay = toDisplayUnits(
            stockLine.availableNumberOfPacks,
            row.isVaccine,
            row.doses
          );
          return batchUsed - availableDisplay > 0.0001;
        });
      });

      if (invalidMultiBatchUsed) {
        error(
          `For ${invalidMultiBatchUsed.item}, batch Issued is mandatory and must equal row Issued.`
        )();
        return;
      }

      if (invalidMultiBatchCapacity) {
        error(
          `For ${invalidMultiBatchCapacity.item}, one or more batch Issued values exceed that batch stock.`
        )();
        return;
      }

      if (usedRows.length > 0 && !selectedPatientId) {
        error('Select a patient before confirming issued quantities')();
        return;
      }

      if (wastageRows.length > 0 && isReasonOptionsLoading) {
        error('Still loading adjustment reasons. Please try again.')();
        return;
      }

      if (vaccineWastageRows.length > 0 && !openVialWastageReason) {
        error(
          'Missing required reason option "Open Vial Wastage" in the system. Add it before confirming Daily Tally.'
        )();
        return;
      }

      if (nonVaccineWastageRows.length > 0 && !damagedReason) {
        error(
          'Missing required reason option "Damaged" in the system. Add it before confirming Daily Tally.'
        )();
        return;
      }

      const coverageEligibleVaccineRows = vaccineRowsWithUse.filter(row => {
        const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
          showChild: false,
          showWomen: false,
        };
        return visibility.showChild || visibility.showWomen;
      });
      const hasCoverageEligibleVaccineUse = coverageEligibleVaccineRows.length > 0;

      if (hasCoverageEligibleVaccineUse && !isSimplifiedMode) {
        const missingCoverageRow = coverageEligibleVaccineRows.find(
          row =>
            !hasVisibleCoverageValues(
              coverageByItem[row.itemId],
              coverageFieldVisibilityByItem[row.itemId] ?? {
                showChild: false,
                showWomen: false,
              }
            )
        );
        if (missingCoverageRow) {
          error(`Enter coverage for ${missingCoverageRow.item}.`)();
          return;
        }

        const mismatchedCoverageRows = coverageEligibleVaccineRows.filter(row => {
          const coverage = coverageByItem[row.itemId];
          if (!coverage) return true;

          const coverageTotal = getVisibleCoverageUsedTotal(
            coverage,
            coverageFieldVisibilityByItem[row.itemId] ?? {
              showChild: false,
              showWomen: false,
            }
          );
          return Math.abs(coverageTotal - row.used) > 0.0001;
        });

        if (mismatchedCoverageRows.length > 0) {
          const summary = mismatchedCoverageRows
            .slice(0, 3)
            .map(row => {
              const coverageTotal = getVisibleCoverageUsedTotal(
                coverageByItem[row.itemId],
                coverageFieldVisibilityByItem[row.itemId] ?? {
                  showChild: false,
                  showWomen: false,
                }
              );
              return `${row.item} (Coverage ${coverageTotal}, Issued ${row.used})`;
            })
            .join('; ');
          const remainingCount = mismatchedCoverageRows.length - 3;

          error(
            `Coverage and Issued must match for all vaccine items before confirming: ${summary}${remainingCount > 0 ? `; and ${remainingCount} more item(s)` : ''}.`
          )();
          return;
        }
      }

      if (
        hasCoverageEligibleVaccineUse &&
        !coverageSummary &&
        !isSimplifiedMode
      ) {
        error('Enter coverage details for vaccinated groups')();
        return;
      }

      if (!skipSummaryDialog) {
        setConfirmSummaryRows(buildConfirmationRows(activeRows));
        setConfirmSummaryOpen(true);
        return;
      }

      if (!skipDuplicateWarning && existingSameDayTallyForSelectedPatient) {
        setConfirmSummaryOpen(false);
        setDuplicateWarningOpen(true);
        return;
      }

      setIsSaving(true);

      if (usedRows.length > 0 && selectedPatientId) {
        const prescriptionId = FnUtils.generateUUID();
        const prescription = await createPrescription({
          id: prescriptionId,
          patientId: selectedPatientId,
          theirReference: tallyReference,
          prescriptionDate: Formatter.toIsoString(
            DateUtils.endOfDayOrNull(new Date())
          ),
        });

        createdPrescriptionId = prescription?.id;
        if (!createdPrescriptionId) {
          throw new Error('Could not create daily tally prescription');
        }
        const confirmedPrescriptionId = createdPrescriptionId;

        let lines = usedRows.flatMap(row => {
          const rowDoses = dosesForItemId?.[row.itemId];
          const perDoseCoverages = rowDoses?.map(dose => ({
            doseId: dose.id,
            doseLabel: dose.label,
            coverage: perDoseCoverageByItem[row.itemId]?.[dose.id] ?? defaultVaccineCoverageDraft(coverageTemplate),
          }));
          const lineNote = dailyTallyLineNote(
            row,
            coverageByItem[row.itemId],
            coverageFieldVisibilityByItem[row.itemId] ?? {
              showChild: false,
              showWomen: false,
            },
            perDoseCoverages
          );

          if (row.stockLines.length > 1) {
            const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};

            return row.stockLines.flatMap(stockLine => {
              const batchUsed = batchDraftById[stockLine.id]?.used ?? 0;
              if (batchUsed <= 0) return [];

              const packs = toPacks(batchUsed, row.isVaccine, row.doses);
              if (packs <= 0) return [];
              if (packs - stockLine.availableNumberOfPacks > 0.0001) {
                throw new Error(`Insufficient stock for ${row.item}`);
              }

              return {
                id: FnUtils.generateUUID(),
                invoiceId: confirmedPrescriptionId,
                stockLineId: stockLine.id,
                numberOfPacks: packs,
                note: lineNote,
              };
            });
          }

          const requiredPacks = toPacks(row.used, row.isVaccine, row.doses);
          const { allocations, remaining } = allocateAcrossStockLines(
            row.stockLines,
            requiredPacks
          );

          if (remaining > 0.0001) {
            throw new Error(`Insufficient stock for ${row.item}`);
          }

          return allocations
            .filter(({ packs }) => packs > 0)
            .map(({ stockLine, packs }) => ({
              id: FnUtils.generateUUID(),
              invoiceId: confirmedPrescriptionId,
              stockLineId: stockLine.id,
              numberOfPacks: packs,
              note: lineNote,
            }));
        });

        if (lines.length === 0) {
          lines = usedRows.flatMap(row => {
            const rowDoses = dosesForItemId?.[row.itemId];
            const perDoseCoverages = rowDoses?.map(dose => ({
              doseId: dose.id,
              doseLabel: dose.label,
              coverage: perDoseCoverageByItem[row.itemId]?.[dose.id] ?? defaultVaccineCoverageDraft(coverageTemplate),
            }));
            const lineNote = dailyTallyLineNote(
              row,
              coverageByItem[row.itemId],
              coverageFieldVisibilityByItem[row.itemId] ?? {
                showChild: false,
                showWomen: false,
              },
              perDoseCoverages
            );
            const requiredPacks = toPacks(row.used, row.isVaccine, row.doses);
            const { allocations, remaining } = allocateAcrossStockLines(
              row.stockLines,
              requiredPacks
            );

            if (remaining > 0.0001) {
              throw new Error(`Insufficient stock for ${row.item}`);
            }

            return allocations
              .filter(({ packs }) => packs > 0)
              .map(({ stockLine, packs }) => ({
                id: FnUtils.generateUUID(),
                invoiceId: confirmedPrescriptionId,
                stockLineId: stockLine.id,
                numberOfPacks: packs,
                note: lineNote,
              }));
          });
        }

        if (lines.length === 0) {
          throw new Error(
            'Could not create daily tally prescription lines. Check issued values and batch allocation.'
          );
        }

        await prescriptionApi.upsertPrescription({
          storeId,
          input: {
            insertPrescriptionLines: lines,
            updatePrescriptions: [
              {
                id: confirmedPrescriptionId,
                status: UpdatePrescriptionStatusInput.Verified,
              },
            ],
          },
        });

      }

      if (wastageRows.length > 0) {
        const usedPacksByStockLineId = usedRows.reduce<Record<string, number>>(
          (acc, row) => {
            if (row.stockLines.length > 1) {
              const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};
              const batchUsedTotal = sumBatchDraft(batchDraftById, 'used');

              if (batchUsedTotal > 0) {
                for (const stockLine of row.stockLines) {
                  const batchUsed = batchDraftById[stockLine.id]?.used ?? 0;
                  if (batchUsed <= 0) continue;
                  const usedPacks = toPacks(batchUsed, row.isVaccine, row.doses);
                  acc[stockLine.id] = round((acc[stockLine.id] ?? 0) + usedPacks);
                }
              } else {
                // Fallback to the same allocation logic used for prescription lines
                const requiredPacks = toPacks(row.used, row.isVaccine, row.doses);
                const { allocations } = allocateAcrossStockLines(
                  row.stockLines,
                  requiredPacks
                );
                for (const { stockLine, packs } of allocations) {
                  acc[stockLine.id] = round((acc[stockLine.id] ?? 0) + packs);
                }
              }

              return acc;
            }

            const requiredPacks = toPacks(row.used, row.isVaccine, row.doses);
            const { allocations } = allocateAcrossStockLines(row.stockLines, requiredPacks);
            for (const { stockLine, packs } of allocations) {
              acc[stockLine.id] = round((acc[stockLine.id] ?? 0) + packs);
            }

            return acc;
          },
          {}
        );

        const availableAfterUse = (stockLine: TallyStockLine) =>
          round(
            Math.max(
              0,
              stockLine.availableNumberOfPacks -
                (usedPacksByStockLineId[stockLine.id] ?? 0)
            )
          );

        const stocktakeLineDrafts = wastageRows.flatMap(row => {
          if (row.stockLines.length > 1) {
            const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};
            const batchWastageTotal = sumBatchDraft(batchDraftById, 'wastage');

            if (batchWastageTotal > 0) {
              return row.stockLines.flatMap(stockLine => {
                const batchWastage = batchDraftById[stockLine.id]?.wastage ?? 0;
                if (batchWastage <= 0) return [];

                const packs = toPacks(batchWastage, row.isVaccine, row.doses);
                const availablePacks = availableAfterUse(stockLine);
                if (packs - availablePacks > 0.0001) {
                  throw new Error(`Insufficient stock for ${row.item}`);
                }

                return {
                  stockLineId: stockLine.id,
                  snapshotNumberOfPacks: availablePacks,
                  countedNumberOfPacks: round(availablePacks - packs),
                  packSize: stockLine.packSize,
                  reasonOptionId: row.isVaccine
                    ? openVialWastageReason?.id
                    : damagedReason?.id,
                  comment: row.isVaccine
                    ? 'Open vial wastage'
                    : 'Damaged',
                };
              });
            }

            if (row.wastage <= 0) return [];

            const requiredPacks = toPacks(row.wastage, row.isVaccine, row.doses);
            const adjustedStockLines = row.stockLines.map(stockLine => ({
              ...stockLine,
              availableNumberOfPacks: availableAfterUse(stockLine),
            }));
            const { allocations, remaining } = allocateAcrossStockLines(
              adjustedStockLines,
              requiredPacks
            );

            if (remaining > 0.0001) {
              throw new Error(`Insufficient stock for ${row.item}`);
            }

            return allocations.map(({ stockLine, packs }) => ({
              stockLineId: stockLine.id,
              snapshotNumberOfPacks: stockLine.availableNumberOfPacks,
              countedNumberOfPacks: round(stockLine.availableNumberOfPacks - packs),
              packSize: stockLine.packSize,
              reasonOptionId: row.isVaccine
                ? openVialWastageReason?.id
                : damagedReason?.id,
              comment: row.isVaccine ? 'Open vial wastage' : 'Damaged',
            }));
          }

          const requiredPacks = toPacks(row.wastage, row.isVaccine, row.doses);
          const adjustedStockLines = row.stockLines.map(stockLine => ({
            ...stockLine,
            availableNumberOfPacks: availableAfterUse(stockLine),
          }));
          const { allocations, remaining } = allocateAcrossStockLines(
            adjustedStockLines,
            requiredPacks
          );

          if (remaining > 0.0001) {
            throw new Error(`Insufficient stock for ${row.item}`);
          }

          return allocations.map(({ stockLine, packs }) => ({
            stockLineId: stockLine.id,
            snapshotNumberOfPacks: stockLine.availableNumberOfPacks,
            countedNumberOfPacks: round(stockLine.availableNumberOfPacks - packs),
            packSize: stockLine.packSize,
            reasonOptionId: row.isVaccine
              ? openVialWastageReason?.id
              : damagedReason?.id,
            comment: row.isVaccine ? 'Open vial wastage' : 'Damaged',
          }));
        });

        if (stocktakeLineDrafts.length > 0) {
          const stocktakeId = FnUtils.generateUUID();
          createdStocktakeId = stocktakeId;
          const deleteDraftStocktake = async () => {
            await stocktakeApi.deleteStocktakes({
              storeId,
              ids: [{ id: stocktakeId }],
            });
          };

          const inserted = await stocktakeApi.insertStocktake({
            storeId,
            input: {
              id: stocktakeId,
              createBlankStocktake: true,
              description: 'Daily tally wastage',
              comment: createdPrescriptionId
                ? `${tallyReference} | prescription:${createdPrescriptionId}`
                : tallyReference,
            },
          });

          if (inserted.insertStocktake.__typename !== 'StocktakeNode') {
            throw new Error('Could not create daily tally stocktake');
          }

          const insertedLines = await stocktakeApi.upsertStocktakeLines({
            storeId,
            insertStocktakeLines: stocktakeLineDrafts.map(line => ({
              id: FnUtils.generateUUID(),
              stocktakeId,
              ...line,
            })),
          });

          const insertResponses =
            insertedLines.batchStocktake.insertStocktakeLines ?? [];
          const insertedCount = insertResponses.filter(
            response => response.response.__typename === 'StocktakeLineNode'
          ).length;
          const insertErrorResponse = insertResponses.find(
            response => response.response.__typename === 'InsertStocktakeLineError'
          )?.response;

          if (insertErrorResponse?.__typename === 'InsertStocktakeLineError' || insertedCount === 0) {
            await deleteDraftStocktake();
            throw new Error(
              (insertErrorResponse?.__typename === 'InsertStocktakeLineError'
                ? insertErrorResponse.error.description
                : undefined) ||
                'Could not create daily tally wastage adjustment lines'
            );
          }

          const finalised = await stocktakeApi.updateStocktake({
            storeId,
            input: {
              id: stocktakeId,
              status: UpdateStocktakeStatusInput.Finalised,
            },
          });

          if (finalised.updateStocktake.__typename !== 'StocktakeNode') {
            await deleteDraftStocktake();
            throw new Error(
              finalised.updateStocktake.error.description ||
                'Could not finalise daily tally wastage adjustment'
            );
          }
        }
      }

      const totalUsed = round(usedRows.reduce((sum, row) => sum + row.used, 0));
      const totalWastage = round(
        wastageRows.reduce((sum, row) => sum + row.wastage, 0)
      );
      success(
        `Daily tally confirmed (Issued: ${totalUsed}, Wastage: ${totalWastage})`
      )();
      setConfirmSummaryOpen(false);
      setDuplicateWarningOpen(false);
      window.location.assign(dailyTallyListPath);
    } catch (e) {
      if (createdStocktakeId) {
        try {
          await stocktakeApi.deleteStocktakes({
            storeId,
            ids: [{ id: createdStocktakeId }],
          });
        } catch {}
      }

      if (createdPrescriptionId) {
        try {
          await prescriptionApi.deletePrescriptions({
            storeId,
            deletePrescriptions: [createdPrescriptionId],
          });
        } catch {}
      }

      error((e as Error).message || 'Unexpected error')();
    } finally {
      setIsSaving(false);
    }
  };

  const summaryGridTemplateColumns = {
    xs: 'minmax(140px,2fr) repeat(3,minmax(0,1fr))',
    sm: 'minmax(180px,2fr) repeat(3,minmax(0,1fr))',
    md: 'minmax(220px,2fr) repeat(3,minmax(0,1fr))',
    lg: 'minmax(260px,2.1fr) repeat(3,minmax(0,1fr))',
  } as const;

  const childCoverageGridTemplateColumns = {
    xs: 'minmax(90px,1fr) minmax(160px,2fr) repeat(7,minmax(0,1fr))',
    sm: 'minmax(100px,1fr) minmax(190px,2fr) repeat(7,minmax(0,1fr))',
    md: 'minmax(110px,1fr) minmax(220px,2fr) repeat(7,minmax(0,1fr))',
    lg: 'minmax(120px,1fr) minmax(260px,2.1fr) repeat(7,minmax(0,1fr))',
  } as const;

  const womenCoverageGridTemplateColumns = {
    xs: 'minmax(90px,1fr) minmax(160px,2fr) repeat(3,minmax(0,1fr))',
    sm: 'minmax(100px,1fr) minmax(190px,2fr) repeat(3,minmax(0,1fr))',
    md: 'minmax(110px,1fr) minmax(220px,2fr) repeat(3,minmax(0,1fr))',
    lg: 'minmax(120px,1fr) minmax(260px,2.1fr) repeat(3,minmax(0,1fr))',
  } as const;

  const summaryPrintMarkup = useMemo(() => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const parseNumeric = (value: string | number | null | undefined) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      if (!value) return 0;

      const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const asCount = (value: unknown) => parseNumeric(value as string | number | null | undefined);

    const summaryRowsHtml = confirmSummaryRows
      .map(
        row => `
          <tr>
            <td class="left">${escapeHtml(row.item)}</td>
            <td class="left">${escapeHtml(row.batch)}</td>
            <td class="center">${escapeHtml(row.issued)}</td>
            <td class="center">${escapeHtml(row.wastage)}</td>
          </tr>
        `
      )
      .join('');

    const coverageRowsHtml = childCoverageSummaryRows
      .map(row => {
        const underOneMale = asCount(row.childUnderOneMale);
        const underOneFemale = asCount(row.childUnderOneFemale);
        const oneToTwoMale = asCount(row.childOneToTwoMale);
        const oneToTwoFemale = asCount(row.childOneToTwoFemale);
        const twoToFiveMale = asCount(row.childTwoToFiveMale);
        const twoToFiveFemale = asCount(row.childTwoToFiveFemale);
        const childTotal =
          underOneMale +
          underOneFemale +
          oneToTwoMale +
          oneToTwoFemale +
          twoToFiveMale +
          twoToFiveFemale;

        return `
          <tr>
            <td class="center">${escapeHtml(row.doseLabel ?? '-')}</td>
            <td class="left">${escapeHtml(row.itemDisplayName)}</td>
            <td class="center">${underOneMale}</td>
            <td class="center">${underOneFemale}</td>
            <td class="center">${oneToTwoMale}</td>
            <td class="center">${oneToTwoFemale}</td>
            <td class="center">${twoToFiveMale}</td>
            <td class="center">${twoToFiveFemale}</td>
            <td class="center"><strong>${childTotal}</strong></td>
          </tr>
        `;
      })
      .join('');

    const childCoverageGrandTotal = childCoverageSummaryRows.reduce((sum, row) => {
      const childTotal =
        asCount(row.childUnderOneMale) +
        asCount(row.childUnderOneFemale) +
        asCount(row.childOneToTwoMale) +
        asCount(row.childOneToTwoFemale) +
        asCount(row.childTwoToFiveMale) +
        asCount(row.childTwoToFiveFemale);
      return sum + childTotal;
    }, 0);

    const womenRowsHtml = womenCoverageSummaryRows
      .map(row => {
        const womenPregnant = asCount(row.womenPregnant);
        const womenNonPregnant = asCount(row.womenNonPregnant);
        const womenTotal = womenPregnant + womenNonPregnant;

        return `
        <tr>
          <td class="center">${escapeHtml(row.doseLabel ?? '-')}</td>
          <td class="left">${escapeHtml(row.itemDisplayName)}</td>
          <td class="center">${womenPregnant}</td>
          <td class="center">${womenNonPregnant}</td>
          <td class="center"><strong>${womenTotal}</strong></td>
        </tr>
      `;
      })
      .join('');

    const womenCoverageGrandTotal = womenCoverageSummaryRows.reduce(
      (sum, row) => sum + asCount(row.womenPregnant) + asCount(row.womenNonPregnant),
      0
    );

    return `
      <style>
        .daily-tally-summary-print { font-family: Arial, sans-serif; color: #111827; padding: 8px; width: 100%; box-sizing: border-box; }
        .daily-tally-summary-print h1 { margin: 0; font-size: 20px; }
        .daily-tally-summary-print .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 10px 0 14px; }
        .daily-tally-summary-print .meta-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
        .daily-tally-summary-print .meta-label { font-size: 11px; color: #6b7280; }
        .daily-tally-summary-print .meta-value { font-size: 13px; margin-top: 2px; word-break: break-word; }
        .daily-tally-summary-print h2 { font-size: 14px; margin: 12px 0 6px; }
        .daily-tally-summary-print .print-section { margin-bottom: 8px; break-inside: avoid-page; }
        .daily-tally-summary-print table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; page-break-inside: auto; }
        .daily-tally-summary-print thead { display: table-header-group; }
        .daily-tally-summary-print tfoot { display: table-footer-group; }
        .daily-tally-summary-print tr { page-break-inside: avoid; break-inside: avoid; }
        .daily-tally-summary-print th, .daily-tally-summary-print td { border: 1px solid #e5e7eb; padding: 4px 6px; font-size: 11px; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
        .daily-tally-summary-print th {
          background: #e5e7eb !important;
          text-align: center;
          font-weight: 700;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .daily-tally-summary-print .left { text-align: left; }
        .daily-tally-summary-print .center { text-align: center; }
        .daily-tally-summary-print .subheader th {
          background: #f3f4f6 !important;
          font-size: 10px;
          font-weight: 700;
        }
        .daily-tally-summary-print tfoot td {
          background: #f9fafb !important;
          font-weight: 700;
        }
        .daily-tally-summary-print tbody tr:nth-child(even) td {
          background: #fcfcfd;
        }
        @media screen and (min-width: 1000px) {
          .daily-tally-summary-print {
            max-width: 1280px;
            margin: 0 auto;
            padding: 14px;
          }
          .daily-tally-summary-print h1 {
            font-size: 24px;
            letter-spacing: 0.2px;
          }
          .daily-tally-summary-print .meta {
            gap: 10px;
            margin: 12px 0 16px;
          }
          .daily-tally-summary-print .meta-card {
            border-radius: 8px;
            padding: 10px;
          }
          .daily-tally-summary-print .meta-label {
            font-size: 12px;
          }
          .daily-tally-summary-print .meta-value {
            font-size: 14px;
          }
          .daily-tally-summary-print h2 {
            font-size: 16px;
            margin: 14px 0 8px;
          }
          .daily-tally-summary-print .print-section {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px;
            background: #ffffff;
          }
          .daily-tally-summary-print th,
          .daily-tally-summary-print td {
            font-size: 12px;
            padding: 6px 8px;
          }
        }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html, body { width: 100%; height: auto; }
          .daily-tally-summary-print { padding: 0; }
          .daily-tally-summary-print .print-section { break-inside: auto; }
        }
      </style>
      <div class="daily-tally-summary-print">
        <h1>Daily Tally Summary</h1>
        <div class="meta">
          <div class="meta-card"><div class="meta-label">Reference</div><div class="meta-value">${escapeHtml(tallyReference)}</div></div>
          <div class="meta-card"><div class="meta-label">Patient</div><div class="meta-value">${escapeHtml(selectedPatientLabel || '-')}</div></div>
          <div class="meta-card"><div class="meta-label">Lines</div><div class="meta-value">${confirmSummaryRows.length}</div></div>
        </div>

        <div class="print-section">
          <h2>Items issued</h2>
          <table>
            <colgroup>
              <col style="width: 40%;" />
              <col style="width: 28%;" />
              <col style="width: 16%;" />
              <col style="width: 16%;" />
            </colgroup>
            <thead>
              <tr><th>Item</th><th>Batch</th><th>Issued</th><th>Wastage</th></tr>
            </thead>
            <tbody>${summaryRowsHtml || '<tr><td colspan="4">No items entered.</td></tr>'}</tbody>
          </table>
        </div>

        ${childCoverageSummaryRows.length > 0 ? `
          <div class="print-section">
            <h2>Coverage Summary (Children vaccination)</h2>
            <table>
              <colgroup>
                <col style="width: 7%;" />
                <col style="width: 29%;" />
                <col style="width: 8%;" />
                <col style="width: 8%;" />
                <col style="width: 8%;" />
                <col style="width: 8%;" />
                <col style="width: 8%;" />
                <col style="width: 8%;" />
                <col style="width: 16%;" />
              </colgroup>
              <thead>
                <tr>
                  <th rowspan="2">Dose</th>
                  <th rowspan="2">Vaccine</th>
                  <th colspan="2">Under 1 Year</th>
                  <th colspan="2">1-2 Years</th>
                  <th colspan="2">2-5 Years</th>
                  <th rowspan="2">Total (All Children)</th>
                </tr>
                <tr class="subheader">
                  <th>Male</th>
                  <th>Female</th>
                  <th>Male</th>
                  <th>Female</th>
                  <th>Male</th>
                  <th>Female</th>
                </tr>
              </thead>
              <tbody>${coverageRowsHtml}</tbody>
              <tfoot>
                <tr>
                  <td class="left" colspan="8">Grand total</td>
                  <td class="center">${childCoverageGrandTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ` : ''}

        ${womenCoverageSummaryRows.length > 0 ? `
          <div class="print-section">
            <h2>Coverage Summary (Women vaccination)</h2>
            <table>
              <colgroup>
                <col style="width: 9%;" />
                <col style="width: 44%;" />
                <col style="width: 16%;" />
                <col style="width: 18%;" />
                <col style="width: 13%;" />
              </colgroup>
              <thead>
                <tr>
                  <th rowspan="2">Dose</th>
                  <th rowspan="2">Vaccine</th>
                  <th colspan="2">Women</th>
                  <th rowspan="2">Total</th>
                </tr>
                <tr class="subheader">
                  <th>Pregnant</th>
                  <th>Non-pregnant</th>
                </tr>
              </thead>
              <tbody>${womenRowsHtml}</tbody>
              <tfoot>
                <tr>
                  <td class="left" colspan="4">Grand total</td>
                  <td class="center">${womenCoverageGrandTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  }, [
    confirmSummaryRows,
    childCoverageSummaryRows,
    womenCoverageSummaryRows,
    selectedPatientLabel,
    tallyReference,
  ]);

  const onPrintSummary = async () => {
    const html = buildPrintableHtml(summaryPrintMarkup, {
      title: 'Daily Tally Summary',
      orientation: 'landscape',
    });
    await printHtml(html);
  };

  const onDownloadPdfSummary = async () => {
    const html = buildPrintableHtml(summaryPrintMarkup, {
      title: 'Daily Tally Summary',
      orientation: 'landscape',
    });
    await downloadPdfFromHtml(html);
  };

  const previousWorkflowStep =
    workflowDisplayStepSequence[workflowDisplayStepSequence.indexOf(workflowStep) - 1];
  const hasPreviousWorkflowStep = Boolean(previousWorkflowStep);
  const nextWorkflowStep =
    workflowDisplayStepSequence[workflowDisplayStepSequence.indexOf(workflowStep) + 1];

  const backButtonLabelByStep: Record<WorkflowStep, string> = {
    tally: 'Back',
    coverage: 'Back to Counter',
    'course-items': 'Back to Coverage',
    allocation: 'Back to Coverage',
    wastage: 'Back to Batches',
    'non-vaccine': 'Back to Vaccines',
  };
  const isThreeStepFlow =
    workflowStepSequence.length === 3 &&
    workflowStepSequence[0] === 'allocation' &&
    workflowStepSequence[1] === 'wastage' &&
    workflowStepSequence[2] === 'non-vaccine';
  const backButtonLabel = previousWorkflowStep
    ? workflowStep === 'non-vaccine' && isThreeStepFlow
      ? hasAnyIssuedVaccineRows
        ? 'Back to Open Vial Wastage'
        : 'Back to Vaccines'
      : workflowStep === 'allocation' && previousWorkflowStep === 'course-items'
      ? 'Back to Item Selection'
      : workflowStep === 'wastage' && previousWorkflowStep === 'coverage'
      ? 'Back to Coverage'
      : backButtonLabelByStep[workflowStep]
    : 'Back';
  const continueButtonLabel =
    workflowStep === 'tally'
      ? nextWorkflowStep === 'coverage'
        ? 'Continue to Coverage'
        : 'Continue to Batches'
      : workflowStep === 'coverage'
        ? hasAnyCoverageValues
          ? hasAnyCoveredMultiBatchVaccines
            ? hasCourseItemSelectionStep
              ? 'Continue to Item Selection'
              : 'Continue to Batches'
            : 'Continue to Open Vial Wastage'
          : 'Continue to Non-vaccine'
        : workflowStep === 'course-items'
          ? 'Continue to Batches'
        : workflowStep === 'allocation'
          ? isBaseThreeStepFlow && !hasAnyIssuedVaccineRows
            ? 'Continue to Non-vaccine'
            : 'Continue to Open Vial Wastage'
          : workflowStep === 'wastage'
          ? nextWorkflowStep === 'non-vaccine'
            ? 'Continue to Non-vaccine'
            : 'Confirm'
          : 'Confirm';

  const continueButtonIsFinal = !nextWorkflowStep;
  const backButtonLabelForDisplay = keepTopRightButtonTextVisible
    ? 'Back'
    : backButtonLabel;
  const continueButtonLabelForDisplay = keepTopRightButtonTextVisible
    ? workflowStep === 'tally'
      ? continueButtonLabel
      : continueButtonIsFinal
        ? 'Save'
        : 'Next'
    : continueButtonLabel;

  const selectedTallyRow = selectedTallyItemId
    ? vaccineRows.find(row => row.itemId === selectedTallyItemId) ?? null
    : null;
  const selectedTallyDoses = selectedTallyRow
    ? dosesForItemId?.[selectedTallyRow.itemId] ?? []
    : [];
  const selectedTallyDoseId = selectedTallyRow
    ? selectedDoseIdByItem[selectedTallyRow.itemId] ?? selectedTallyDoses[0]?.id ?? ''
    : '';
  const selectedTallyDoseLabel =
    selectedTallyDoses.find(dose => dose.id === selectedTallyDoseId)?.label ?? '';
  const selectedTallyVisibility = selectedTallyRow
    ? (coverageFieldVisibilityByItem[selectedTallyRow.itemId] ?? {
        showChild: false,
        showWomen: false,
      })
    : {
        showChild: false,
        showWomen: false,
      };
  const isSelectedTallyWomenOnly =
    selectedTallyVisibility.showWomen && !selectedTallyVisibility.showChild;
  const selectedTallyCategoryOptions = selectedTallyRow
    ? getTallyCategoryOptionsForRow(selectedTallyRow)
    : tallyAgeGroups;
  const selectedTallyWomenBaseLabel =
    selectedTallyRow && isSelectedTallyWomenOnly
      ? getWomenBaseLabelForRow(selectedTallyRow)
      : '';
  const selectedTallyEffectiveAgeKey = selectedTallyCategoryOptions.some(
    option => option.key === activeTallyAge
  )
    ? activeTallyAge
    : (selectedTallyCategoryOptions[0]?.key ?? 'under1');
  const selectedTallyEffectiveGenderKey = isSelectedTallyWomenOnly
    ? ('female' as const)
    : activeTallyGender;
  const selectedTallySessionKey = selectedTallyRow
    ? selectedTallyDoses.length > 0
      ? getSessionTallyKey(selectedTallyRow.itemId, selectedTallyDoseId)
      : getSessionTallyKey(selectedTallyRow.itemId)
    : null;
  const selectedTallyDraft = selectedTallySessionKey
    ? sessionTallyByItem[selectedTallySessionKey] ?? createEmptySessionTallyDraft()
    : null;
  const tallyCourseOptions = useMemo(() => {
    const optionsByCourseName: Record<string, { courseName: string; itemId: string }> = {};
    for (const row of vaccineRows) {
      const courseName = courseNameByItemId?.[row.itemId] ?? row.item;
      if (!optionsByCourseName[courseName]) {
        optionsByCourseName[courseName] = {
          courseName,
          itemId: row.itemId,
        };
      }
    }
    return Object.values(optionsByCourseName).sort((a, b) =>
      a.courseName.localeCompare(b.courseName)
    );
  }, [courseNameByItemId, vaccineRows]);
  const canUndoFocusedTally = selectedTallyRow
    ? tallyTapHistory.some(
        action =>
          action.itemId === selectedTallyRow.itemId &&
          action.ageKey === selectedTallyEffectiveAgeKey &&
          action.genderKey === selectedTallyEffectiveGenderKey &&
          (action.doseId ?? '') === selectedTallyDoseId
      )
    : false;

  useEffect(() => {
    if (!selectedTallyRow) return;
    if (selectedTallyDoses.length === 0) return;

    const currentSelectedDoseId = selectedDoseIdByItem[selectedTallyRow.itemId];
    const doseExists = selectedTallyDoses.some(dose => dose.id === currentSelectedDoseId);

    if (!currentSelectedDoseId || !doseExists) {
      const firstDose = selectedTallyDoses[0];
      if (!firstDose) return;
      setSelectedDoseIdByItem(previous => ({
        ...previous,
        [selectedTallyRow.itemId]: firstDose.id,
      }));
    }
  }, [selectedDoseIdByItem, selectedTallyDoses, selectedTallyRow]);

  useEffect(() => {
    if (!selectedTallyRow) return;

    if (!selectedTallyCategoryOptions.some(option => option.key === activeTallyAge)) {
      const firstCategory = selectedTallyCategoryOptions[0];
      if (firstCategory) setActiveTallyAge(firstCategory.key);
    }

    if (isSelectedTallyWomenOnly && activeTallyGender !== 'female') {
      setActiveTallyGender('female');
    }
  }, [
    activeTallyAge,
    activeTallyGender,
    isSelectedTallyWomenOnly,
    selectedTallyCategoryOptions,
    selectedTallyRow,
  ]);

  const childCoverageModalGrandTotal = childCoverageSummaryRows.reduce((sum, coverageRow) => {
    const total =
      coverageRow.childUnderOneMale +
      coverageRow.childUnderOneFemale +
      coverageRow.childOneToTwoMale +
      coverageRow.childOneToTwoFemale +
      coverageRow.childTwoToFiveMale +
      coverageRow.childTwoToFiveFemale;
    return sum + total;
  }, 0);

  const womenCoverageModalGrandTotal = womenCoverageSummaryRows.reduce((sum, coverageRow) => {
    return sum + coverageRow.womenPregnant + coverageRow.womenNonPregnant;
  }, 0);

  return (
    <>
      <ConfirmSummaryModal
        title={'Confirm daily tally'}
        width={5000}
        height={5000}
        sx={{
          width: 'calc(100vw - 16px)',
          minWidth: 'calc(100vw - 16px)',
          maxWidth: 'calc(100vw - 16px)',
          height: 'calc(100vh - 16px)',
          minHeight: 'calc(100vh - 16px)',
          maxHeight: 'calc(100vh - 16px)',
          margin: '8px',
          borderRadius: '16px',
        }}
        okButton={
          <LoadingButton
            label={'Confirm'}
            color="secondary"
            variant="contained"
            shouldShrink={false}
            isLoading={isSaving}
            onClick={async () => await onConfirm(true)}
          />
        }
        cancelButton={
          <DialogButton
            variant="cancel"
            shouldShrink={false}
            onClick={() => setConfirmSummaryOpen(false)}
          />
        }
      >
        <Stack
          spacing={2}
          sx={{
            width: '100%',
            maxWidth: '100%',
            maxHeight: 'none',
            overflowY: 'visible',
            overflowX: 'hidden',
            paddingBottom: 0,
            boxSizing: 'border-box',
          }}
        >
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <ButtonWithIcon
              Icon={<PrinterIcon />}
              label={t('button.print')}
              shouldShrink={false}
              onClick={onPrintSummary}
              sx={{ paddingX: 1.25, paddingY: 0.5 }}
            />
            <ButtonWithIcon
              Icon={<DownloadIcon />}
              label={t('button.download-pdf')}
              shouldShrink={false}
              onClick={onDownloadPdfSummary}
            />
          </Box>

          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }}
            gap={1.5}
            sx={{
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 1,
              padding: 1.5,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Reference
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tallyReference}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Patient
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPatientLabel}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Lines
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {confirmSummaryRows.length}
              </Typography>
            </Box>
          </Box>

          {confirmSummaryRows.length > 0 ? (
            <Box
              sx={{
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 1,
                overflowX: 'auto',
              }}
            >
              <Box sx={{ minWidth: '100%' }}>
                <Box
                  display="grid"
                  columnGap={1}
                  alignItems="center"
                  sx={{
                    gridTemplateColumns: summaryGridTemplateColumns,
                    paddingX: 1.5,
                    paddingY: 1,
                    backgroundColor: 'background.menu',
                    borderBottom: '1px solid rgba(0,0,0,0.12)',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Item
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Batch
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Issued
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Wastage
                  </Typography>
                </Box>
                {confirmSummaryRows.map((summaryRow, index) => (
                  <Box
                    key={`${summaryRow.item}-${summaryRow.batch}-${summaryRow.issued}-${index}`}
                    display="grid"
                    columnGap={1}
                    alignItems="center"
                    sx={{
                      gridTemplateColumns: summaryGridTemplateColumns,
                      paddingX: 1.5,
                      paddingY: 0.85,
                      borderBottom:
                        index === confirmSummaryRows.length - 1
                          ? 'none'
                          : '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    <Typography variant="body2">{summaryRow.item}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {summaryRow.batch}
                    </Typography>
                    <Typography variant="body2">{summaryRow.issued}</Typography>
                    <Typography variant="body2">{summaryRow.wastage}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No summary lines available.
            </Typography>
          )}
          {!isSimplifiedMode && confirmCoverageRows.length > 0 ? (
            <Box
              sx={{
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 1,
                padding: 1.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, display: 'block', marginBottom: 1 }}
              >
                Coverage Summary (Daily Report)
              </Typography>

              {useDesktopCoverageSummaryLayout ? (
                <>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, display: 'block', marginBottom: 0.5 }}
                  >
                    Children vaccination
                  </Typography>
                  <Box
                    sx={{
                      border: '1px solid rgba(0,0,0,0.12)',
                      borderRadius: 1,
                      overflowX: 'auto',
                    }}
                  >
                    <Box sx={{ minWidth: '100%' }}>
                      <Box
                        sx={{
                          backgroundColor: 'background.menu',
                          borderBottom: '1px solid rgba(0,0,0,0.12)',
                        }}
                      >
                        <Box
                          display="grid"
                          columnGap={1}
                          alignItems="center"
                          sx={{
                            gridTemplateColumns: childCoverageGridTemplateColumns,
                            paddingX: 1.25,
                            paddingY: 0.75,
                          }}
                        >
                          <Box />
                          <Box />
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              textAlign: 'center',
                              gridColumn: '3 / span 2',
                            }}
                          >
                            Children under 1 years
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              textAlign: 'center',
                              gridColumn: '5 / span 2',
                            }}
                          >
                            Children 1 to 2 years
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              textAlign: 'center',
                              gridColumn: '7 / span 2',
                            }}
                          >
                            Children 2 to 5 years
                          </Typography>
                          <Box />
                        </Box>
                        <Box
                          display="grid"
                          columnGap={1}
                          alignItems="center"
                          sx={{
                            gridTemplateColumns: childCoverageGridTemplateColumns,
                            paddingX: 1.25,
                            paddingY: 0.85,
                            borderTop: '1px solid rgba(0,0,0,0.08)',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Dose
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Vaccine
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                            Male
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                            Female
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                            Male
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                            Female
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                            Male
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                            Female
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                            Total
                          </Typography>
                        </Box>
                      </Box>
                      {childCoverageSummaryRows.map((coverageRow, index) => {
                        const total =
                          coverageRow.childUnderOneMale +
                          coverageRow.childUnderOneFemale +
                          coverageRow.childOneToTwoMale +
                          coverageRow.childOneToTwoFemale +
                          coverageRow.childTwoToFiveMale +
                          coverageRow.childTwoToFiveFemale;

                        return (
                          <Box
                            key={`child-${coverageRow.itemId}-${coverageRow.doseLabel ?? 'aggregate'}-${index}`}
                            display="grid"
                            columnGap={1}
                            alignItems="center"
                            sx={{
                              gridTemplateColumns: childCoverageGridTemplateColumns,
                              paddingX: 1.25,
                              paddingY: 0.75,
                              backgroundColor:
                                index % 2 === 0 ? 'background.white' : 'background.menu',
                              borderBottom:
                                index === childCoverageSummaryRows.length - 1
                                  ? 'none'
                                  : '1px solid rgba(0,0,0,0.08)',
                            }}
                          >
                            <Typography variant="body2">{coverageRow.doseLabel ?? '-'}</Typography>
                            <Typography variant="body2">{coverageRow.itemDisplayName}</Typography>
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {coverageRow.childUnderOneMale}
                            </Typography>
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {coverageRow.childUnderOneFemale}
                            </Typography>
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {coverageRow.childOneToTwoMale}
                            </Typography>
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {coverageRow.childOneToTwoFemale}
                            </Typography>
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {coverageRow.childTwoToFiveMale}
                            </Typography>
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {coverageRow.childTwoToFiveFemale}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                              {total}
                            </Typography>
                          </Box>
                        );
                      })}
                      {childCoverageSummaryRows.length > 0 ? (
                        <Box
                          display="grid"
                          columnGap={1}
                          alignItems="center"
                          sx={{
                            gridTemplateColumns: childCoverageGridTemplateColumns,
                            paddingX: 1.25,
                            paddingY: 0.85,
                            backgroundColor: 'background.menu',
                            borderTop: '1px solid rgba(0,0,0,0.12)',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Grand total
                          </Typography>
                          <Box />
                          <Box />
                          <Box />
                          <Box />
                          <Box />
                          <Box />
                          <Box />
                          <Typography variant="body2" sx={{ fontWeight: 800, textAlign: 'center' }}>
                            {childCoverageModalGrandTotal}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>
                  </Box>

                  {womenCoverageSummaryRows.length > 0 ? (
                  <>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        display: 'block',
                        marginTop: 1.25,
                        marginBottom: 0.5,
                      }}
                    >
                      Women vaccination
                    </Typography>
                    <Box
                      sx={{
                        border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 1,
                        overflowX: 'auto',
                      }}
                    >
                      <Box sx={{ minWidth: '100%' }}>
                        <Box
                          sx={{
                            backgroundColor: 'background.menu',
                            borderBottom: '1px solid rgba(0,0,0,0.12)',
                          }}
                        >
                          <Box
                            display="grid"
                            columnGap={1}
                            alignItems="center"
                            sx={{
                              gridTemplateColumns: womenCoverageGridTemplateColumns,
                              paddingX: 1.25,
                              paddingY: 0.75,
                            }}
                          >
                            <Box />
                            <Box />
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                textAlign: 'center',
                                gridColumn: '3 / span 2',
                              }}
                            >
                              Women 15 to 49 years
                            </Typography>
                            <Box />
                          </Box>
                          <Box
                            display="grid"
                            columnGap={1}
                            alignItems="center"
                            sx={{
                              gridTemplateColumns: womenCoverageGridTemplateColumns,
                              paddingX: 1.25,
                              paddingY: 0.85,
                              borderTop: '1px solid rgba(0,0,0,0.08)',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              Dose
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              Vaccine
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                              Pregnant
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                              Non pregnant
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                              Total
                            </Typography>
                          </Box>
                        </Box>
                        {womenCoverageSummaryRows.map((coverageRow, index) => {
                          const total =
                            coverageRow.womenPregnant + coverageRow.womenNonPregnant;

                          return (
                            <Box
                              key={`women-${coverageRow.itemId}-${coverageRow.doseLabel ?? 'aggregate'}-${index}`}
                              display="grid"
                              columnGap={1}
                              alignItems="center"
                              sx={{
                                gridTemplateColumns: womenCoverageGridTemplateColumns,
                                paddingX: 1.25,
                                paddingY: 0.75,
                                backgroundColor:
                                  index % 2 === 0 ? 'background.white' : 'background.menu',
                                borderBottom:
                                  index === womenCoverageSummaryRows.length - 1
                                    ? 'none'
                                    : '1px solid rgba(0,0,0,0.08)',
                              }}
                            >
                              <Typography variant="body2">{coverageRow.doseLabel ?? '-'}</Typography>
                              <Typography variant="body2">{coverageRow.itemDisplayName}</Typography>
                              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                                {coverageRow.womenPregnant}
                              </Typography>
                              <Typography variant="body2" sx={{ textAlign: 'center' }}>
                                {coverageRow.womenNonPregnant}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
                                {total}
                              </Typography>
                            </Box>
                          );
                        })}
                        {womenCoverageSummaryRows.length > 0 ? (
                          <Box
                            display="grid"
                            columnGap={1}
                            alignItems="center"
                            sx={{
                              gridTemplateColumns: womenCoverageGridTemplateColumns,
                              paddingX: 1.25,
                              paddingY: 0.85,
                              backgroundColor: 'background.menu',
                              borderTop: '1px solid rgba(0,0,0,0.12)',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              Grand total
                            </Typography>
                            <Box />
                            <Box />
                            <Box />
                            <Typography variant="body2" sx={{ fontWeight: 800, textAlign: 'center' }}>
                              {womenCoverageModalGrandTotal}
                            </Typography>
                          </Box>
                        ) : null}
                      </Box>
                    </Box>
                  </>
                  ) : null}
                </>
              ) : (
                <Stack spacing={1.25}>
                  {confirmCoverageRows.map(coverageRow => {
                    const childTotal =
                      coverageRow.childUnderOneMale +
                      coverageRow.childUnderOneFemale +
                      coverageRow.childOneToTwoMale +
                      coverageRow.childOneToTwoFemale +
                      coverageRow.childTwoToFiveMale +
                      coverageRow.childTwoToFiveFemale;
                    const womenTotal =
                      coverageRow.womenPregnant + coverageRow.womenNonPregnant;
                    const showChild = childTotal > 0;
                    const showWomen = womenTotal > 0;

                    if (!showChild && !showWomen) return null;

                    return (
                      <Box
                        key={`compact-${coverageRow.itemId}-${coverageRow.doseLabel ?? 'aggregate'}`}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          padding: 1,
                          backgroundColor: 'background.white',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 700, marginBottom: 0.75 }}>
                          {coverageRow.itemDisplayName}
                        </Typography>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(2,minmax(0,1fr))"
                          columnGap={1}
                          rowGap={0.5}
                        >
                          <Typography variant="caption" color="text.secondary">Dose</Typography>
                          <Typography variant="body2" textAlign="right">{coverageRow.doseLabel ?? '-'}</Typography>
                          {showChild ? (
                            <>
                          <Typography variant="caption" color="text.secondary">U1 M</Typography>
                          <Typography variant="body2" textAlign="right">{coverageRow.childUnderOneMale}</Typography>
                          <Typography variant="caption" color="text.secondary">U1 F</Typography>
                          <Typography variant="body2" textAlign="right">{coverageRow.childUnderOneFemale}</Typography>
                          <Typography variant="caption" color="text.secondary">1-2 M</Typography>
                          <Typography variant="body2" textAlign="right">{coverageRow.childOneToTwoMale}</Typography>
                          <Typography variant="caption" color="text.secondary">1-2 F</Typography>
                          <Typography variant="body2" textAlign="right">{coverageRow.childOneToTwoFemale}</Typography>
                          <Typography variant="caption" color="text.secondary">2-5 M</Typography>
                          <Typography variant="body2" textAlign="right">{coverageRow.childTwoToFiveMale}</Typography>
                          <Typography variant="caption" color="text.secondary">2-5 F</Typography>
                          <Typography variant="body2" textAlign="right">{coverageRow.childTwoToFiveFemale}</Typography>
                          <Typography variant="caption" color="text.secondary">Child Total</Typography>
                          <Typography variant="body2" textAlign="right" sx={{ fontWeight: 700 }}>{childTotal}</Typography>
                            </>
                          ) : null}
                          {showWomen ? (
                          <>
                            <Typography variant="caption" color="text.secondary">Pregnant</Typography>
                            <Typography variant="body2" textAlign="right">{coverageRow.womenPregnant}</Typography>
                            <Typography variant="caption" color="text.secondary">Non pregnant</Typography>
                            <Typography variant="body2" textAlign="right">{coverageRow.womenNonPregnant}</Typography>
                            <Typography variant="caption" color="text.secondary">Women Total</Typography>
                            <Typography variant="body2" textAlign="right" sx={{ fontWeight: 700 }}>{womenTotal}</Typography>
                          </>
                          ) : null}
                        </Box>
                      </Box>
                    );
                  })}
                  {(childCoverageModalGrandTotal > 0 || womenCoverageModalGrandTotal > 0) ? (
                    <Box
                      sx={{
                        border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 1,
                        padding: 1,
                        backgroundColor: 'background.menu',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700, marginBottom: 0.5 }}>
                        Grand totals
                      </Typography>
                      <Box display="grid" gridTemplateColumns="repeat(2,minmax(0,1fr))" rowGap={0.35}>
                        <Typography variant="caption" color="text.secondary">Children</Typography>
                        <Typography variant="body2" textAlign="right" sx={{ fontWeight: 700 }}>
                          {childCoverageModalGrandTotal}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Women</Typography>
                        <Typography variant="body2" textAlign="right" sx={{ fontWeight: 700 }}>
                          {womenCoverageModalGrandTotal}
                        </Typography>
                      </Box>
                    </Box>
                  ) : null}
                </Stack>
              )}
            </Box>
          ) : null}
        </Stack>
      </ConfirmSummaryModal>

      <DuplicateWarningModal
        title={'Daily tally already exists'}
        width={760}
        height={250}
        contentProps={{
          sx: {
            pt: 1,
            pb: 0.5,
            px: 2,
          },
        }}
        sx={{
          width: 'min(760px, calc(100vw - 32px))',
          minWidth: 'min(760px, calc(100vw - 32px))',
          maxWidth: 'min(760px, calc(100vw - 32px))',
          borderRadius: '14px',
          margin: '16px',
          '& .MuiDialogTitle-root': {
            fontSize: theme => theme.typography.subtitle1.fontSize,
            lineHeight: theme => theme.typography.subtitle1.lineHeight,
          },
          '& .MuiDialogActions-root': {
            marginTop: '6px',
            marginBottom: '6px',
          },
        }}
        okButton={
          <DialogButton
            variant="ok"
            customLabel="Create Another Tally"
            onClick={async () => {
              setDuplicateWarningOpen(false);
              await onConfirm(true, true);
            }}
          />
        }
        cancelButton={
          <DialogButton
            variant="cancel"
            customLabel="Go Back"
            onClick={() => setDuplicateWarningOpen(false)}
          />
        }
      >
        <Stack spacing={0.75} sx={{ py: 0, pl: 0.75 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            A daily tally already exists for{' '}
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                px: 0.75,
                py: 0.2,
                borderRadius: '6px',
                border: '1px solid rgba(0,0,0,0.18)',
                backgroundColor: 'rgba(0,0,0,0.04)',
                fontWeight: 800,
                color: 'text.primary',
                fontFamily: 'monospace',
                lineHeight: 1.25,
              }}
            >
              {duplicateWarningPatientName}
            </Box>{' '}
            on this date.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Creating another tally for the same day may duplicate submitted activity.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Do you want to continue and create another daily tally anyway?
          </Typography>
        </Stack>
      </DuplicateWarningModal>

      <AppBarContentPortal
        sx={{
          paddingBottom: '16px',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Box>
            <Typography fontWeight="bold">Daily tally</Typography>
          </Box>
          <Box sx={{ width: { xs: '100%', sm: 260 } }}>
            <Select
              value={selectedPatientId}
              onChange={event => setSelectedPatientId(String(event.target.value || ''))}
              options={patientOptions}
              disabled={isPatientsLoading}
              slotProps={{
                input: shouldHighlightPatientSelection
                  ? {
                      sx: {
                        backgroundColor: 'rgba(255, 193, 7, 0.22)',
                        boxShadow: 'inset 0 0 0 1px rgba(245, 124, 0, 0.5)',
                      },
                    }
                  : undefined,
              }}
              sx={{
                width: '100%',
              }}
            />
          </Box>
          <BasicTextInput
            size="small"
            placeholder="Daily tally reference"
            value={referenceText}
            onChange={event => setReferenceText(event.target.value)}
            sx={{ width: { xs: '100%', sm: 280 } }}
          />
        </Box>
      </AppBarContentPortal>

      <AppBarButtonsPortal>
        {hasPreviousWorkflowStep ? (
          <LoadingButton
            label={backButtonLabelForDisplay}
            startIcon={<ArrowLeftIcon />}
            color="secondary"
            variant="outlined"
            shouldShrink={!keepTopRightButtonTextVisible}
            sx={{ marginRight: 1.25 }}
            onClick={moveToPreviousWorkflowStep}
            isLoading={false}
          />
        ) : null}
        <LoadingButton
          startIcon={
            continueButtonIsFinal
              ? <SaveIcon />
              : undefined
          }
          endIcon={
            !continueButtonIsFinal
              ? <ArrowRightIcon />
              : undefined
          }
          label={continueButtonLabelForDisplay}
          color="secondary"
          variant="contained"
          shouldShrink={!keepTopRightButtonTextVisible}
          onClick={moveToNextWorkflowStep}
          isLoading={
            continueButtonIsFinal ? isSaving : false
          }
        />
      </AppBarButtonsPortal>

      <Box
        ref={contentContainerRef}
        paddingBottom={2}
        sx={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            paddingX: { xs: 1, sm: 1.5, md: 2 },
            paddingBottom: 1,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading daily tally items...
            </Typography>
          ) : isError ? (
            <Typography variant="body2" color="error.main">
              Could not load daily tally items.
            </Typography>
          ) : rows.length === 0 ? (
            <NothingHere
              body={'No stock items are available for Daily Tally.'}
            />
          ) : (
            <>
              {workflowStep === 'tally' ? (
                <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                  {selectedTallyRow && selectedTallyDraft ? (
                    <Box
                      sx={{
                        border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 1,
                        padding: 1.5,
                        marginBottom: 1.25,
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr',
                          rowGap: 1,
                          width: '100%',
                          minWidth: 0,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            VACCINE COURSE
                          </Typography>
                          <Box display="flex" gap={0.75} marginTop={0.5} flexWrap="wrap">
                            {tallyCourseOptions.map(option => {
                              const isSelected = option.itemId === selectedTallyRow.itemId;
                              return (
                                <Box
                                  key={`course-option-${option.courseName}`}
                                  component="button"
                                  type="button"
                                  onClick={() => setSelectedTallyItemId(option.itemId)}
                                  sx={{
                                    border: isSelected
                                      ? '1px solid rgba(237,108,2,0.9)'
                                      : '1px solid rgba(0,0,0,0.2)',
                                    backgroundColor: isSelected
                                      ? 'rgba(237,108,2,0.14)'
                                      : 'background.paper',
                                    color: 'text.primary',
                                    borderRadius: 1,
                                    paddingX: 1.25,
                                    paddingY: 0.7,
                                    fontWeight: 700,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {option.courseName}
                                </Box>
                              );
                            })}
                          </Box>
                          {selectedTallyDoses.length > 0 ? (
                            <Box sx={{ marginTop: 1.25 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                DOSE
                              </Typography>
                              <Box display="flex" gap={0.75} marginTop={0.5} flexWrap="wrap">
                                {selectedTallyDoses.map(dose => {
                                  const isSelectedDose = selectedTallyDoseId === dose.id;

                                  return (
                                    <Box
                                      key={`tally-dose-option-${dose.id}`}
                                      component="button"
                                      type="button"
                                      onClick={() =>
                                        setSelectedDoseIdByItem(previous => ({
                                          ...previous,
                                          [selectedTallyRow.itemId]: dose.id,
                                        }))
                                      }
                                      sx={{
                                        border: isSelectedDose
                                          ? '1px solid rgba(237,108,2,0.9)'
                                          : '1px solid rgba(0,0,0,0.2)',
                                        backgroundColor: isSelectedDose
                                          ? 'rgba(237,108,2,0.14)'
                                          : 'background.paper',
                                        color: 'text.primary',
                                        borderRadius: 1,
                                        paddingX: 1.1,
                                        paddingY: 0.6,
                                        fontWeight: 700,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {dose.label}
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          ) : null}
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          marginTop: 1.25,
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          padding: { xs: 1.25, sm: 1.75 },
                          backgroundColor: 'background.default',
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 360px) minmax(0, 1fr)' },
                            gap: 2,
                            alignItems: 'stretch',
                            width: '100%',
                            minWidth: 0,
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              minWidth: 0,
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                width: 'max-content',
                              }}
                            >
                              {!isSelectedTallyWomenOnly ? (
                                <>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    GENDER
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: 'grid',
                                      gridTemplateColumns: 'max-content',
                                      gap: 0.75,
                                      marginTop: 0.5,
                                    }}
                                  >
                                    {tallyGenderGroups.map(({ key, label }) => {
                                      const isSelected = selectedTallyEffectiveGenderKey === key;
                                      return (
                                        <Box
                                          key={key}
                                          component="button"
                                          type="button"
                                          onClick={() => setActiveTallyGender(key)}
                                          sx={{
                                            border: isSelected
                                              ? '1px solid rgba(237,108,2,0.9)'
                                              : '1px solid rgba(0,0,0,0.2)',
                                            backgroundColor: isSelected
                                              ? 'rgba(237,108,2,0.14)'
                                              : 'background.paper',
                                            color: 'text.primary',
                                            borderRadius: 1,
                                            width: 'auto',
                                            textAlign: 'left',
                                            paddingX: 1.25,
                                            paddingY: 0.75,
                                            fontWeight: 700,
                                            fontSize: 15,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          {label}
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                </>
                              ) : null}
                            </Box>

                            <Box
                              sx={{
                                marginTop: isSelectedTallyWomenOnly ? 0 : 2,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                width: 'max-content',
                              }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                {isSelectedTallyWomenOnly ? 'WOMEN 15-49 YEARS' : 'AGE GROUP'}
                              </Typography>
                              {isSelectedTallyWomenOnly ? (
                                <Box
                                  sx={{
                                    marginTop: 0.25,
                                    border: '1px solid rgba(237,108,2,0.9)',
                                    backgroundColor: 'rgba(237,108,2,0.14)',
                                    color: 'text.primary',
                                    borderRadius: 1,
                                    width: 'auto',
                                    textAlign: 'left',
                                    paddingX: 1.25,
                                    paddingY: 0.75,
                                    fontWeight: 700,
                                    fontSize: 15,
                                    lineHeight: 1.2,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  {selectedTallyWomenBaseLabel}
                                </Box>
                              ) : null}
                              {isSelectedTallyWomenOnly ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ marginTop: 0.75, fontWeight: 700 }}
                                >
                                  PREGNANCY STATUS
                                </Typography>
                              ) : null}
                              <Box
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: 'max-content',
                                  gap: 0.75,
                                  marginTop: isSelectedTallyWomenOnly ? 0.4 : 0.5,
                                }}
                              >
                                {selectedTallyCategoryOptions.map(({ key, label }) => {
                                  const isSelected = selectedTallyEffectiveAgeKey === key;
                                  return (
                                    <Box
                                      key={key}
                                      component="button"
                                      type="button"
                                      onClick={() => setActiveTallyAge(key)}
                                      sx={{
                                        border: isSelected
                                          ? '1px solid rgba(237,108,2,0.9)'
                                          : '1px solid rgba(0,0,0,0.2)',
                                        backgroundColor: isSelected
                                          ? 'rgba(237,108,2,0.14)'
                                          : 'background.paper',
                                        color: 'text.primary',
                                        borderRadius: 1,
                                        width: 'auto',
                                        textAlign: 'left',
                                        paddingX: 1.25,
                                        paddingY: 0.75,
                                        fontWeight: 700,
                                        fontSize: 15,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {label}
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>

                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 0,
                              width: '100%',
                              position: 'relative',
                              paddingBottom: { xs: 7, md: 0 },
                            }}
                          >
                            {showTallyTapHint ? (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: { xs: -28, sm: -48, md: -68 },
                                  transform: 'translateY(-50%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  zIndex: 1,
                                  pointerEvents: 'none',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'rgba(0,0,0,0.33)',
                                    letterSpacing: 0.1,
                                    whiteSpace: 'nowrap',
                                    fontSize: { xs: 15, sm: 17 },
                                  }}
                                >
                                  Tap to add 1{' '}
                                  <Box
                                    component="span"
                                    sx={{
                                      fontSize: { xs: 21, sm: 24 },
                                      lineHeight: 0,
                                      verticalAlign: 'middle',
                                      color: 'rgba(0,0,0,0.36)',
                                    }}
                                  >
                                    →
                                  </Box>
                                </Typography>
                              </Box>
                            ) : null}
                            <Box
                              component="button"
                              type="button"
                              onClick={() => incrementFocusedTallyCell(selectedTallyRow)}
                              sx={{
                                width: { xs: 240, sm: 320, lg: 380 },
                                height: { xs: 240, sm: 320, lg: 380 },
                                maxWidth: '100%',
                                borderRadius: '50%',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: '#eb6d27',
                                color: '#fff',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 8px 24px rgba(235, 109, 39, 0.25)',
                              }}
                            >
                              {selectedTallyDoseLabel ? (
                                <Typography
                                  variant="body1"
                                  sx={{
                                    marginBottom: 0.5,
                                    fontWeight: 800,
                                    letterSpacing: 0.4,
                                    color: 'rgba(255,255,255,0.95)',
                                    textAlign: 'center',
                                    fontSize: { xs: 18, sm: 20 },
                                  }}
                                >
                                  {selectedTallyDoseLabel}
                                </Typography>
                              ) : null}
                              <Typography variant="h1" sx={{ fontSize: { xs: 72, sm: 92, lg: 112 }, fontWeight: 800, lineHeight: 1 }}>
                                {
                                  selectedTallyDraft.counts[selectedTallyEffectiveAgeKey][
                                    selectedTallyEffectiveGenderKey
                                  ]
                                }
                              </Typography>
                              {!isSelectedTallyWomenOnly ? (
                                <Typography
                                  variant="h5"
                                  sx={{ fontWeight: 800, letterSpacing: 1, color: '#fff', fontSize: { xs: 28, sm: 32 } }}
                                >
                                  {selectedTallyEffectiveGenderKey.toUpperCase()}
                                </Typography>
                              ) : null}
                              <Typography
                                variant="body1"
                                sx={{
                                  marginTop: 0.25,
                                  fontWeight: 700,
                                  color: 'rgba(255,255,255,0.95)',
                                  textAlign: 'center',
                                  fontSize: { xs: 18, sm: 20 },
                                }}
                              >
                                {
                                  selectedTallyCategoryOptions.find(
                                    ({ key }) => key === selectedTallyEffectiveAgeKey
                                  )?.label ?? ''
                                }
                              </Typography>
                            </Box>

                            <Box
                              component="button"
                              type="button"
                              onClick={() => undoLastTallyTap(selectedTallyRow)}
                              disabled={!canUndoFocusedTally}
                              sx={{
                                position: 'absolute',
                                right: { xs: '50%', md: 6 },
                                bottom: { xs: 0, md: 8 },
                                transform: { xs: 'translateX(50%)', md: 'none' },
                                width: 84,
                                height: 84,
                                borderRadius: '50%',
                                border: '2px solid rgba(245, 158, 11, 0.72)',
                                backgroundColor: 'rgba(255, 247, 230, 0.96)',
                                color: '#6F3B00',
                                fontWeight: 700,
                                fontSize: 14,
                                lineHeight: 1.2,
                                textAlign: 'center',
                                boxShadow: '0 10px 24px rgba(245, 158, 11, 0.24)',
                                cursor: 'pointer',
                                padding: 1,
                                '&:disabled': {
                                  opacity: 0.62,
                                  backgroundColor: 'rgba(255,255,255,0.92)',
                                  color: 'rgba(0,0,0,0.55)',
                                  border: '1px solid rgba(0,0,0,0.2)',
                                  cursor: 'not-allowed',
                                  boxShadow: '0 6px 14px rgba(0,0,0,0.06)',
                                },
                              }}
                            >
                              Undo last
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              ) : null}

              {workflowStep === 'coverage' ? (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', marginY: 1 }}>
                    Vaccine coverage
                  </Typography>
                  <Box
                    sx={{
                      width: { xs: '100%', md: '75%' },
                      minWidth: 0,
                      display: 'block',
                    }}
                  >
                    {filteredVaccineRows
                      .filter(row => {
                        const v = coverageFieldVisibilityByItem[row.itemId] ?? {
                          showChild: false,
                          showWomen: false,
                        };
                        return v.showChild || v.showWomen;
                      })
                      .map(row => {
                      const coverage = coverageByItem[row.itemId] ?? defaultVaccineCoverageDraft(coverageTemplate);
                      const coverageDisplayName = courseNameByItemId?.[row.itemId] ?? row.item;
                      const coverageVisibility = coverageFieldVisibilityByItem[row.itemId] ?? { showChild: false, showWomen: false };
                      const itemDoses = dosesForItemId?.[row.itemId] ?? [];
                      const combinedCoverage =
                        itemDoses.length > 0
                          ? computeAggregateCoverage(
                              perDoseCoverageByItem[row.itemId] ?? {},
                              defaultVaccineCoverageDraft(coverageTemplate)
                            )
                          : coverage;
                      const issuedDosesTotal = getVisibleCoverageUsedTotal(
                        combinedCoverage,
                        coverageVisibility
                      );
                      const hasCoverage = hasVisibleCoverageValues(
                        combinedCoverage,
                        coverageVisibility
                      );
                      const isExpanded = expandedCoverageItemIds[row.itemId] ?? false;
                      const coverageSohWarning = coverageExceedsSohByItem[row.itemId];
                      const selectedDoseId = selectedDoseIdByItem[row.itemId] ?? itemDoses[0]?.id ?? '';
                      const activeCoverage = itemDoses.length > 0
                        ? (perDoseCoverageByItem[row.itemId]?.[selectedDoseId] ?? defaultVaccineCoverageDraft(coverageTemplate))
                        : coverage;
                      const updateActiveCoverage = (updater: (current: VaccineCoverageDraft) => VaccineCoverageDraft) => {
                        if (itemDoses.length > 0 && selectedDoseId) {
                          updateDoseCoverageForRow(row, selectedDoseId, updater);
                        } else {
                          updateCoverageForRow(row, updater);
                        }
                      };

                      return (
                        <Box
                          key={`coverage-expand-${row.itemId}`}
                          sx={{
                            marginBottom: 1.25,
                            width: '100%',
                            minWidth: '100%',
                            display: 'block',
                            boxSizing: 'border-box',
                          }}
                        >
                          <Box
                            role="button"
                            onClick={() => setExpandedCoverageItemIds(prev => ({ ...prev, [row.itemId]: !prev[row.itemId] }))}
                            sx={{
                              border: hasCoverage ? '1px solid rgba(25,118,210,0.38)' : '1px solid rgba(0,0,0,0.12)',
                              backgroundColor: hasCoverage ? 'rgba(25,118,210,0.10)' : 'background.white',
                              borderRadius: isExpanded ? '4px 4px 0 0' : 1,
                              paddingX: 1.25,
                              paddingY: 1,
                              width: '100%',
                              boxSizing: 'border-box',
                              cursor: 'pointer',
                            }}
                          >
                            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                              <Box>
                                <Typography variant="body1" sx={{ fontWeight: isExpanded ? 700 : 'normal' }}>
                                  {coverageDisplayName}
                                </Typography>
                              </Box>
                              <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                                {hasCoverage ? (
                                  <Box
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      paddingX: 1.25,
                                      paddingY: 0.5,
                                      borderRadius: 1,
                                      border: '1px solid rgba(0,0,0,0.18)',
                                      backgroundColor: 'rgba(0,0,0,0.03)',
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.76rem', lineHeight: 1.2 }}>
                                      Issued doses: {issuedDosesTotal}
                                    </Typography>
                                  </Box>
                                ) : null}
                                <ChevronDownIcon
                                  sx={{
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                    color: 'text.secondary',
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>

                          {isExpanded ? (
                            <Box
                              sx={{
                                border: hasCoverage ? '1px solid rgba(25,118,210,0.38)' : '1px solid rgba(0,0,0,0.12)',
                                borderTop: 'none',
                                borderRadius: '0 0 4px 4px',
                                paddingX: 1.25,
                                paddingY: 1.5,
                                width: '100%',
                                boxSizing: 'border-box',
                              }}
                            >
                              {coverageSohWarning ? (
                                <Typography
                                  variant="caption"
                                  color="error.main"
                                  sx={{ display: 'block', marginBottom: 0.75, fontWeight: 700 }}
                                >
                                  Coverage total ({coverageSohWarning.coverageTotal}) exceeds SOH ({coverageSohWarning.soh}). Reduce coverage to continue.
                                </Typography>
                              ) : null}
                              <Box
                                display="flex"
                                gap={1.5}
                                alignItems={
                                  itemDoses.length > 0 &&
                                  (coverageVisibility.showChild || coverageVisibility.showWomen)
                                    ? 'stretch'
                                    : 'flex-start'
                                }
                              >
                                {itemDoses.length > 0 ? (
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 0.5,
                                      flexShrink: 0,
                                      minWidth: 72,
                                    }}
                                  >
                                    {itemDoses.map(dose => {
                                      const isSelected = selectedDoseId === dose.id;
                                      return (
                                        <Box
                                          key={dose.id}
                                          role="button"
                                          onClick={() =>
                                            setSelectedDoseIdByItem(prev => ({
                                              ...prev,
                                              [row.itemId]: dose.id,
                                            }))
                                          }
                                          sx={{
                                            paddingX: 1,
                                            paddingY: 0.75,
                                            borderRadius: 1,
                                            border: isSelected
                                              ? '1px solid rgba(237,108,2,0.75)'
                                              : '1px solid rgba(0,0,0,0.18)',
                                            backgroundColor: isSelected
                                              ? 'rgba(237,108,2,0.16)'
                                              : 'background.white',
                                            boxShadow: isSelected
                                              ? '0 3px 10px rgba(237,108,2,0.16)'
                                              : 'none',
                                            position: 'relative',
                                            zIndex: isSelected ? 2 : 1,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'border 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), z-index 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&::after': isSelected
                                              ? {
                                                  content: '""',
                                                  position: 'absolute',
                                                  top: '50%',
                                                  right: -10,
                                                  transform: 'translateY(-50%)',
                                                  width: 6,
                                                  height: 2,
                                                  backgroundColor: 'rgba(237,108,2,0.78)',
                                                  borderRadius: 999,
                                                  boxShadow: '0 0 6px rgba(237,108,2,0.18)',
                                                  pointerEvents: 'none',
                                                  transition: 'opacity 0.4s ease-in-out',
                                                }
                                              : undefined,
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              fontWeight: isSelected ? 700 : 400,
                                              fontSize: '0.72rem',
                                              color: isSelected ? '#8A3C00' : 'inherit',
                                            }}
                                          >
                                            {dose.label}
                                          </Typography>
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                ) : null}
                                <Box
                                  flex={1}
                                  minWidth={0}
                                  sx={
                                    itemDoses.length > 0 &&
                                    (coverageVisibility.showChild || coverageVisibility.showWomen)
                                      ? {
                                          display: 'flex',
                                          flexDirection: 'column',
                                        }
                                      : undefined
                                  }
                                >
                              {coverageVisibility.showChild ? (
                                <Box
                                  key={selectedDoseId}
                                  sx={{
                                    border:
                                      itemDoses.length > 0
                                        ? '1px solid rgba(237,108,2,0.75)'
                                        : '1px solid rgba(0,0,0,0.12)',
                                    boxShadow:
                                      itemDoses.length > 0
                                        ? '0 3px 10px rgba(237,108,2,0.16)'
                                        : 'none',
                                    borderRadius: 1,
                                    padding: 1,
                                    position: 'relative',
                                    zIndex: itemDoses.length > 0 ? 2 : 1,
                                    flex: itemDoses.length > 0 ? 1 : undefined,
                                    transition: 'border 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), flex 0.4s cubic-bezier(0.4, 0, 0.2, 1), z-index 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    animation: 'fadeInRefresh 0.5s ease-in-out',
                                    '@keyframes fadeInRefresh': {
                                      from: { opacity: 0.5 },
                                      to: { opacity: 1 },
                                    },
                                  }}
                                >
                                  <Box
                                    display="grid"
                                    gridTemplateColumns="minmax(220px,2fr) repeat(3,minmax(0,1fr))"
                                    columnGap={1.25}
                                    rowGap={0.75}
                                    alignItems="center"
                                  >
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Child coverage</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Male</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Female</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Total</Typography>
                                    {activeCoverage.childAgeGroups.map(ageGroup => (
                                      <React.Fragment key={ageGroup.id}>
                                        <Typography variant="body2">{ageGroup.label}</Typography>
                                        <BasicTextInput
                                          type="text"
                                          size="small"
                                          inputMode={numericInputMode}
                                          inputProps={numericHtmlInputProps}
                                          sx={compactNumberInputSx}
                                          value={String(ageGroup.male)}
                                          onFocus={selectZeroValueOnFocus}
                                          onChange={event =>
                                            updateActiveCoverage(current => ({
                                              ...current,
                                              childAgeGroups: current.childAgeGroups.map(group =>
                                                group.id === ageGroup.id
                                                  ? { ...group, male: parseWholeNumber(event.target.value) }
                                                  : group
                                              ),
                                            }))
                                          }
                                        />
                                        <BasicTextInput
                                          type="text"
                                          size="small"
                                          inputMode={numericInputMode}
                                          inputProps={numericHtmlInputProps}
                                          sx={compactNumberInputSx}
                                          value={String(ageGroup.female)}
                                          onFocus={selectZeroValueOnFocus}
                                          onChange={event =>
                                            updateActiveCoverage(current => ({
                                              ...current,
                                              childAgeGroups: current.childAgeGroups.map(group =>
                                                group.id === ageGroup.id
                                                  ? { ...group, female: parseWholeNumber(event.target.value) }
                                                  : group
                                              ),
                                            }))
                                          }
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                          {ageGroup.male + ageGroup.female}
                                        </Typography>
                                      </React.Fragment>
                                    ))}
                                  </Box>
                                </Box>
                              ) : null}
                              {coverageVisibility.showWomen ? (
                                <Box
                                  key={selectedDoseId}
                                  sx={{
                                    marginTop: coverageVisibility.showChild ? 1.25 : 0,
                                    border:
                                      itemDoses.length > 0
                                        ? '1px solid rgba(237,108,2,0.75)'
                                        : '1px solid rgba(0,0,0,0.12)',
                                    boxShadow:
                                      itemDoses.length > 0
                                        ? '0 3px 10px rgba(237,108,2,0.16)'
                                        : 'none',
                                    borderRadius: 1,
                                    padding: 1,
                                    position: 'relative',
                                    zIndex: itemDoses.length > 0 ? 2 : 1,
                                    flex:
                                      !coverageVisibility.showChild && itemDoses.length > 0
                                        ? 1
                                        : undefined,
                                    transition: 'border 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1), flex 0.4s cubic-bezier(0.4, 0, 0.2, 1), z-index 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    animation: 'fadeInRefresh 0.5s ease-in-out',
                                    '@keyframes fadeInRefresh': {
                                      from: { opacity: 0.5 },
                                      to: { opacity: 1 },
                                    },
                                  }}
                                >
                                  <Box
                                    display="grid"
                                    gridTemplateColumns="minmax(220px,2fr) repeat(3,minmax(0,1fr))"
                                    columnGap={1.25}
                                    rowGap={0.75}
                                    alignItems="center"
                                  >
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Women coverage</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Non pregnant</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Pregnant</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Total</Typography>
                                    {(() => {
                                      const { nonPregnantGroup, pregnantGroup } = resolveWomenCoverageGroups(activeCoverage.womenAgeGroups);
                                      const womenBaseLabel = womenCoverageLabel(nonPregnantGroup, pregnantGroup);
                                      const nonPregnant = nonPregnantGroup?.count ?? 0;
                                      const pregnant = pregnantGroup?.count ?? 0;
                                      return (
                                        <>
                                          <Typography variant="body2">{womenBaseLabel}</Typography>
                                          <BasicTextInput
                                            type="text"
                                            size="small"
                                            inputMode={numericInputMode}
                                            inputProps={numericHtmlInputProps}
                                            sx={compactNumberInputSx}
                                            value={String(nonPregnant)}
                                            onFocus={selectZeroValueOnFocus}
                                            onChange={event =>
                                              updateActiveCoverage(current => ({
                                                ...current,
                                                womenAgeGroups: (() => {
                                                  const nextCount = parseWholeNumber(event.target.value);
                                                  if (nonPregnantGroup?.id) {
                                                    return current.womenAgeGroups.map(group =>
                                                      group.id === nonPregnantGroup.id ? { ...group, count: nextCount } : group
                                                    );
                                                  }
                                                  const fallbackId = pregnantGroup?.id ? `${pregnantGroup.id}-non-pregnant` : 'women-non-pregnant';
                                                  const fallbackLabel = womenBaseLabel === 'Women' ? 'Women - Non pregnant' : `${womenBaseLabel} - Non pregnant`;
                                                  return [...current.womenAgeGroups, { id: fallbackId, label: fallbackLabel, count: nextCount }];
                                                })(),
                                              }))
                                            }
                                          />
                                          <BasicTextInput
                                            type="text"
                                            size="small"
                                            inputMode={numericInputMode}
                                            inputProps={numericHtmlInputProps}
                                            sx={compactNumberInputSx}
                                            value={String(pregnant)}
                                            onFocus={selectZeroValueOnFocus}
                                            onChange={event =>
                                              updateActiveCoverage(current => ({
                                                ...current,
                                                womenAgeGroups: (() => {
                                                  const nextCount = parseWholeNumber(event.target.value);
                                                  if (pregnantGroup?.id) {
                                                    return current.womenAgeGroups.map(group =>
                                                      group.id === pregnantGroup.id ? { ...group, count: nextCount } : group
                                                    );
                                                  }
                                                  const fallbackId = nonPregnantGroup?.id ? `${nonPregnantGroup.id}-pregnant` : 'women-pregnant';
                                                  const fallbackLabel = womenBaseLabel === 'Women' ? 'Women - Pregnant' : `${womenBaseLabel} - Pregnant`;
                                                  return [...current.womenAgeGroups, { id: fallbackId, label: fallbackLabel, count: nextCount }];
                                                })(),
                                              }))
                                            }
                                          />
                                          <Typography variant="body2" color="text.secondary">
                                            {nonPregnant + pregnant}
                                          </Typography>
                                        </>
                                      );
                                    })()}
                                  </Box>
                                </Box>
                              ) : null}
                                </Box>
                              </Box>
                            </Box>
                          ) : null}
                        </Box>
                      );
                    })}
                  </Box>
                </>
              ) : null}

              {workflowStep === 'course-items' ? (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', marginY: 1 }}>
                    Select Items Used Per Vaccine Course
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1.25 }}>
                    For each course below, select one or more in-stock items that were used.
                  </Typography>

                  {courseItemSelectionCandidates.map(candidate => {
                    const selectedItemIds = selectedCourseItemIdsByCourse[candidate.courseName] ?? [];
                    const hasSelection = selectedItemIds.length > 0;

                    return (
                      <Box
                        key={`course-item-select-${candidate.courseName}`}
                        sx={{
                          border: hasSelection
                            ? '1px solid rgba(25,118,210,0.35)'
                            : '1px solid rgba(0,0,0,0.12)',
                          backgroundColor: hasSelection
                            ? 'rgba(25,118,210,0.08)'
                            : 'background.white',
                          borderRadius: 1,
                          padding: 1.25,
                          marginBottom: 1.25,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {candidate.courseName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', marginTop: 0.25 }}>
                          Select at least one item.
                        </Typography>

                        <Box
                          display="grid"
                          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(auto-fit,minmax(260px,1fr))' }}
                          gap={0.75}
                          sx={{ marginTop: 0.9 }}
                        >
                          {candidate.items.map(item => {
                            const isSelected = selectedItemIds.includes(item.itemId);

                            return (
                              <Box
                                key={`course-item-option-${candidate.courseName}-${item.itemId}`}
                                component="button"
                                type="button"
                                onClick={() =>
                                  toggleCourseItemSelection(candidate.courseName, item.itemId)
                                }
                                sx={{
                                  border: isSelected
                                    ? '1px solid rgba(237,108,2,0.9)'
                                    : '1px solid rgba(0,0,0,0.2)',
                                  backgroundColor: isSelected
                                    ? 'rgba(237,108,2,0.14)'
                                    : 'background.paper',
                                  borderRadius: 1,
                                  paddingX: 1,
                                  paddingY: 0.75,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500 }}>
                                  {item.itemName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  SOH: {item.soh}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
                </>
              ) : null}

              {displayedVaccineRows.length > 0 ? (
                <Box display="flex" alignItems="center" sx={{ marginY: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {workflowStep === 'allocation' && !isThreeStepFlow
                      ? 'Vaccine batch allocation'
                      : workflowStep === 'wastage'
                        ? 'Open vial wastage'
                        : 'Vaccine items'}
                  </Typography>
                </Box>
              ) : null}

              {isVaccineBucketOpen
                ? displayedVaccineRows.map(row => {
                    const coverage =
                      coverageByItem[row.itemId] ?? defaultVaccineCoverageDraft(coverageTemplate);
                    const rowDisplayName =
                      workflowStep === 'coverage'
                        ? courseNameByItemId?.[row.itemId] ?? row.item
                        : row.item;
                    const coverageVisibility = coverageFieldVisibilityByItem[row.itemId] ?? {
                      showChild: false,
                      showWomen: false,
                    };
                    const coverageSohWarning = coverageExceedsSohByItem[row.itemId];
                    const batchOptions = row.stockLines.map(stockLine => ({
                      value: stockLine.id,
                      label: batchLabel(stockLine),
                    }));
                    const batchUsedTotal = sumBatchDraft(row.batchDraftById, 'used');
                    const hasBatchIssuedMismatch = Math.abs(batchUsedTotal - row.used) > 0.0001;
                    const isAllocationStep = workflowStep === 'allocation';
                    const isWastageStep = workflowStep === 'wastage';
                    const itemDoses = dosesForItemId?.[row.itemId] ?? [];
                    const combinedCoverage =
                      itemDoses.length > 0
                        ? computeAggregateCoverage(
                            perDoseCoverageByItem[row.itemId] ?? {},
                            defaultVaccineCoverageDraft(coverageTemplate)
                          )
                        : coverage;
                    const issuedDosesTotal = getVisibleCoverageUsedTotal(
                      combinedCoverage,
                      coverageVisibility
                    );
                    const selectedDoseId =
                      selectedDoseIdByItem[row.itemId] ?? itemDoses[0]?.id ?? '';
                    const activeCoverage =
                      itemDoses.length > 0
                        ? (perDoseCoverageByItem[row.itemId]?.[selectedDoseId] ??
                          defaultVaccineCoverageDraft(coverageTemplate))
                        : coverage;
                    const updateActiveCoverage = (
                      updater: (current: VaccineCoverageDraft) => VaccineCoverageDraft
                    ) => {
                      if (itemDoses.length > 0 && selectedDoseId) {
                        updateDoseCoverageForRow(row, selectedDoseId, updater);
                      } else {
                        updateCoverageForRow(row, updater);
                      }
                    };
                    const isThreeStepStepOneAllocation =
                      isAllocationStep && isBaseThreeStepFlow;
                    const hasIssuedDoses = issuedDosesTotal > 0;
                    const isStepOneVaccineExpanded =
                      expandedStepOneVaccineItemIds[row.itemId] ?? false;
                    const showExpandedVaccineContent =
                      !isThreeStepStepOneAllocation || isStepOneVaccineExpanded;
                    const shouldHighlightUpperIssuedValue =
                      (isAllocationStep || isWastageStep) &&
                      row.stockLines.length > 1 &&
                      hasBatchIssuedMismatch;

                    return (
                      <Box
                        key={row.itemId}
                        sx={{
                          marginBottom: 1.25,
                          width: '100%',
                          boxSizing: 'border-box',
                          ...(isThreeStepStepOneAllocation
                            ? {}
                            : {
                                border: '1px solid rgba(0,0,0,0.12)',
                                backgroundColor: 'background.white',
                                borderRadius: 1,
                                paddingX: 2,
                                paddingY: 1.5,
                              }),
                        }}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          gap={1}
                          role={isThreeStepStepOneAllocation ? 'button' : undefined}
                          onClick={
                            isThreeStepStepOneAllocation
                              ? () =>
                                  setExpandedStepOneVaccineItemIds(previous => ({
                                    ...previous,
                                    [row.itemId]: !previous[row.itemId],
                                  }))
                              : undefined
                          }
                          sx={
                            isThreeStepStepOneAllocation
                              ? {
                                  cursor: 'pointer',
                                  border: hasIssuedDoses
                                    ? '1px solid rgba(25,118,210,0.38)'
                                    : '1px solid rgba(0,0,0,0.12)',
                                  backgroundColor: hasIssuedDoses
                                    ? 'rgba(25,118,210,0.10)'
                                    : 'background.white',
                                  borderRadius: isStepOneVaccineExpanded
                                    ? '4px 4px 0 0'
                                    : 1,
                                  paddingX: 1.25,
                                  paddingY: 1,
                                  width: '100%',
                                  boxSizing: 'border-box',
                                }
                              : undefined
                          }
                        >
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: isStepOneVaccineExpanded ? 700 : 'normal' }}
                          >
                            {rowDisplayName}
                          </Typography>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="flex-end"
                            gap={1}
                            flexWrap="wrap"
                          >
                            {(workflowStep !== 'allocation' && workflowStep !== 'wastage') ||
                            (isThreeStepStepOneAllocation && hasIssuedDoses) ? (
                              <Box
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  paddingX: 1.25,
                                  paddingY: 0.5,
                                  borderRadius: 1,
                                  border: '1px solid rgba(0,0,0,0.18)',
                                  backgroundColor: 'rgba(0,0,0,0.03)',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 700, fontSize: '0.76rem', lineHeight: 1.2 }}
                                >
                                  Issued doses: {issuedDosesTotal}
                                </Typography>
                              </Box>
                            ) : null}
                            {isThreeStepStepOneAllocation ? (
                              <ChevronDownIcon
                                sx={{
                                  transform: isStepOneVaccineExpanded
                                    ? 'rotate(180deg)'
                                    : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                  color: 'text.secondary',
                                }}
                              />
                            ) : null}
                          </Box>
                        </Box>

                        {showExpandedVaccineContent ? (
                          <Box
                            sx={
                              isThreeStepStepOneAllocation
                                ? {
                                    border: '1px solid rgba(0,0,0,0.12)',
                                    borderTop: 'none',
                                    borderRadius: '0 0 4px 4px',
                                    paddingX: 2,
                                    paddingY: 1.5,
                                  }
                                : undefined
                            }
                          >
                        {workflowStep === 'coverage' && coverageSohWarning ? (
                          <Typography
                            variant="caption"
                            color="error.main"
                            sx={{ display: 'block', marginTop: 0.75, fontWeight: 700 }}
                          >
                            Coverage total ({coverageSohWarning.coverageTotal}) exceeds SOH ({coverageSohWarning.soh}).
                            Reduce coverage to continue.
                          </Typography>
                        ) : null}

                        {isAllocationStep || isWastageStep ? (
                          <Box
                            display="grid"
                            gridTemplateColumns={
                              isAllocationStep
                                ? 'repeat(4,minmax(0,1fr))'
                                : 'repeat(7,minmax(0,1fr))'
                            }
                            columnGap={0.75}
                            rowGap={0.75}
                            alignItems="center"
                            marginTop={0.75}
                          >
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            SOH
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Batch
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Units
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Issued
                          </Typography>
                          {isWastageStep ? (
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              Open vial wastage
                            </Typography>
                          ) : null}
                          {isWastageStep ? (
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              Wasted
                            </Typography>
                          ) : null}
                          {isWastageStep ? (
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              Remaining
                            </Typography>
                          ) : null}

                          {isWastageStep && row.stockLines.length > 1 ? (
                            <>
                              {row.stockLines.map(stockLine => {
                                const batchDraft = row.batchDraftById?.[stockLine.id] ?? {
                                  used: 0,
                                  wastage: 0,
                                  openVialWastage: row.isVaccine,
                                };
                                const batchSoh = toDisplayUnits(
                                  stockLine.availableNumberOfPacks,
                                  row.isVaccine,
                                  row.doses
                                );
                                const batchRemaining = round(
                                  Math.max(0, batchSoh - batchDraft.used - batchDraft.wastage)
                                );

                                return (
                                  <React.Fragment key={`wastage-grid-${row.itemId}-${stockLine.id}`}>
                                    <Typography variant="body2">{batchSoh}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {batchLabel(stockLine)}
                                    </Typography>
                                    <Typography variant="body2">{row.units}</Typography>
                                    <Typography
                                      variant="body2"
                                      sx={
                                        hasBatchIssuedMismatch
                                          ? { fontWeight: 700, color: 'error.main' }
                                          : undefined
                                      }
                                    >
                                      {batchDraft.used}
                                    </Typography>
                                    <Box
                                      display="flex"
                                      justifyContent="center"
                                      alignItems="center"
                                      sx={{ justifySelf: 'center' }}
                                    >
                                      <Switch
                                        checked={batchDraft.openVialWastage}
                                        disabled={batchDraft.used <= 0}
                                        onChange={(_, checked) =>
                                          updateBatchOpenVialWastage(row, stockLine, checked)
                                        }
                                        sx={{ margin: 0 }}
                                      />
                                    </Box>
                                    <BasicTextInput
                                      type="text"
                                      size="small"
                                      inputMode={numericInputMode}
                                      inputProps={numericHtmlInputProps}
                                      sx={compactNumberInputSx}
                                      value={String(batchDraft.wastage)}
                                      onFocus={selectZeroValueOnFocus}
                                      onChange={event =>
                                        updateBatchWastage(row, stockLine, event.target.value)
                                      }
                                    />
                                    <Typography variant="body2">{batchRemaining}</Typography>
                                  </React.Fragment>
                                );
                              })}
                            </>
                          ) : (
                            <>
                              <Typography variant="body2">{row.soh}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {row.stockLines.length > 1
                                  ? 'Needs allocation'
                                  : row.stockLines[0]
                                    ? batchLabel(row.stockLines[0])
                                    : '-'}
                              </Typography>
                              <Typography variant="body2">{row.units}</Typography>
                              {isSimplifiedMode &&
                              !(isWastageStep && row.stockLines.length > 1) &&
                              !(useSimplifiedMobileUi && isWastageStep) ? (
                                <BasicTextInput
                                  type="text"
                                  size="small"
                                  inputMode={numericInputMode}
                                  inputProps={numericHtmlInputProps}
                                  slotProps={
                                    row.stockLines.length > 1 && hasBatchIssuedMismatch
                                      ? highlightedIssuedInputSlotProps
                                      : undefined
                                  }
                                  sx={
                                    shouldHighlightUpperIssuedValue
                                      ? {
                                          ...compactNumberInputSx,
                                          '& input': {
                                            fontWeight: 700,
                                            color: 'error.main',
                                          },
                                        }
                                      : compactNumberInputSx
                                  }
                                  value={String(row.used)}
                                  onFocus={selectZeroValueOnFocus}
                                  onChange={event => updateUsed(row, event.target.value)}
                                />
                              ) : (
                                <Typography
                                  variant="body2"
                                  sx={
                                    shouldHighlightUpperIssuedValue
                                      ? { fontWeight: 700, color: 'error.main' }
                                      : undefined
                                  }
                                >
                                  {row.used}
                                </Typography>
                              )}
                              {isWastageStep ? (
                                <Box
                                  display="flex"
                                  justifyContent="center"
                                  alignItems="center"
                                  sx={{ justifySelf: 'center' }}
                                >
                                  <Switch
                                    checked={row.openVialWastage}
                                    onChange={(_, checked) => updateOpenVialWastage(row, checked)}
                                    sx={{ margin: 0 }}
                                  />
                                </Box>
                              ) : null}
                              {isWastageStep ? (
                                <BasicTextInput
                                  type="text"
                                  size="small"
                                  inputMode={numericInputMode}
                                  inputProps={numericHtmlInputProps}
                                  sx={compactNumberInputSx}
                                  value={String(row.wastage)}
                                  onFocus={selectZeroValueOnFocus}
                                  onChange={event =>
                                    updateDraft(row.itemId, {
                                      wastage: parseInput(event.target.value),
                                    })
                                  }
                                />
                              ) : null}
                              {isWastageStep ? (
                                <Typography variant="body2">{row.remainingStock}</Typography>
                              ) : null}
                            </>
                          )}
                          </Box>
                        ) : null}

                        {workflowStep === 'coverage' ? (
                          <Box sx={{ marginTop: 1 }}>
                            {coverageVisibility.showChild ? (
                            <Box
                              sx={{
                                border:
                                  itemDoses.length > 0
                                    ? '1px solid rgba(237,108,2,0.75)'
                                    : '1px solid rgba(0,0,0,0.12)',
                                boxShadow:
                                  itemDoses.length > 0
                                    ? '0 3px 10px rgba(237,108,2,0.16)'
                                    : 'none',
                                borderRadius: 1,
                                padding: 1,
                              }}
                            >
                              <Box
                                display="grid"
                                gridTemplateColumns="minmax(220px,2fr) repeat(3,minmax(0,1fr))"
                                columnGap={1.25}
                                rowGap={0.75}
                                alignItems="center"
                              >
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Child coverage
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Male
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Female
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Total
                                </Typography>

                                {activeCoverage.childAgeGroups.map(ageGroup => (
                                  <React.Fragment key={ageGroup.id}>
                                    <Typography variant="body2">{ageGroup.label}</Typography>
                                    <BasicTextInput
                                      type="text"
                                      size="small"
                                      inputMode={numericInputMode}
                                      inputProps={numericHtmlInputProps}
                                      sx={compactNumberInputSx}
                                      value={String(ageGroup.male)}
                                      onFocus={selectZeroValueOnFocus}
                                      onChange={event =>
                                        updateActiveCoverage(current => ({
                                          ...current,
                                          childAgeGroups: current.childAgeGroups.map(group =>
                                            group.id === ageGroup.id
                                              ? {
                                                  ...group,
                                                  male: parseWholeNumber(event.target.value),
                                                }
                                              : group
                                          ),
                                        }))
                                      }
                                    />
                                    <BasicTextInput
                                      type="text"
                                      size="small"
                                      inputMode={numericInputMode}
                                      inputProps={numericHtmlInputProps}
                                      sx={compactNumberInputSx}
                                      value={String(ageGroup.female)}
                                      onFocus={selectZeroValueOnFocus}
                                      onChange={event =>
                                        updateActiveCoverage(current => ({
                                          ...current,
                                          childAgeGroups: current.childAgeGroups.map(group =>
                                            group.id === ageGroup.id
                                              ? {
                                                  ...group,
                                                  female: parseWholeNumber(event.target.value),
                                                }
                                              : group
                                          ),
                                        }))
                                      }
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                      {ageGroup.male + ageGroup.female}
                                    </Typography>
                                  </React.Fragment>
                                ))}
                              </Box>
                            </Box>
                            ) : null}

                            {coverageVisibility.showWomen ? (
                            <Box
                              sx={{
                                marginTop: coverageVisibility.showChild ? 1.25 : 0,
                                border: '1px solid rgba(0,0,0,0.12)',
                                borderRadius: 1,
                                padding: 1,
                              }}
                            >
                              <Box
                                display="grid"
                                gridTemplateColumns="minmax(220px,2fr) repeat(3,minmax(0,1fr))"
                                columnGap={1.25}
                                rowGap={0.75}
                                alignItems="center"
                              >
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Women coverage
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Non pregnant
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Pregnant
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  Total
                                </Typography>

                                {(() => {
                                  const { nonPregnantGroup, pregnantGroup } =
                                    resolveWomenCoverageGroups(activeCoverage.womenAgeGroups);
                                  const womenBaseLabel = womenCoverageLabel(
                                    nonPregnantGroup,
                                    pregnantGroup
                                  );

                                  const nonPregnant = nonPregnantGroup?.count ?? 0;
                                  const pregnant = pregnantGroup?.count ?? 0;

                                  return (
                                    <>
                                      <Typography variant="body2">
                                        {womenBaseLabel}
                                      </Typography>
                                    <BasicTextInput
                                      type="text"
                                      size="small"
                                      inputMode={numericInputMode}
                                      inputProps={numericHtmlInputProps}
                                      sx={compactNumberInputSx}
                                      value={String(nonPregnant)}
                                      onFocus={selectZeroValueOnFocus}
                                      onChange={event =>
                                        updateActiveCoverage(current => ({
                                          ...current,
                                          womenAgeGroups: (() => {
                                            const nextCount = parseWholeNumber(
                                              event.target.value
                                            );

                                            if (nonPregnantGroup?.id) {
                                              return current.womenAgeGroups.map(group =>
                                                group.id === nonPregnantGroup.id
                                                  ? { ...group, count: nextCount }
                                                  : group
                                              );
                                            }

                                            const fallbackId =
                                              pregnantGroup?.id
                                                ? `${pregnantGroup.id}-non-pregnant`
                                                : 'women-non-pregnant';
                                            const fallbackLabel =
                                              womenBaseLabel === 'Women'
                                                ? 'Women - Non pregnant'
                                                : `${womenBaseLabel} - Non pregnant`;

                                            return [
                                              ...current.womenAgeGroups,
                                              {
                                                id: fallbackId,
                                                label: fallbackLabel,
                                                count: nextCount,
                                              },
                                            ];
                                          })(),
                                        }))
                                      }
                                    />
                                      <BasicTextInput
                                        type="text"
                                        size="small"
                                        inputMode={numericInputMode}
                                        inputProps={numericHtmlInputProps}
                                        sx={compactNumberInputSx}
                                        value={String(pregnant)}
                                        onFocus={selectZeroValueOnFocus}
                                        onChange={event =>
                                          updateActiveCoverage(current => ({
                                            ...current,
                                            womenAgeGroups: (() => {
                                              const nextCount = parseWholeNumber(
                                                event.target.value
                                              );

                                              if (pregnantGroup?.id) {
                                                return current.womenAgeGroups.map(group =>
                                                  group.id === pregnantGroup.id
                                                    ? { ...group, count: nextCount }
                                                    : group
                                                );
                                              }

                                              const fallbackId =
                                                nonPregnantGroup?.id
                                                  ? `${nonPregnantGroup.id}-pregnant`
                                                  : 'women-pregnant';
                                              const fallbackLabel =
                                                womenBaseLabel === 'Women'
                                                  ? 'Women - Pregnant'
                                                  : `${womenBaseLabel} - Pregnant`;

                                              return [
                                                ...current.womenAgeGroups,
                                                {
                                                  id: fallbackId,
                                                  label: fallbackLabel,
                                                  count: nextCount,
                                                },
                                              ];
                                            })(),
                                          }))
                                        }
                                      />
                                      <Typography variant="body2" color="text.secondary">
                                        {nonPregnant + pregnant}
                                      </Typography>
                                    </>
                                  );
                                })()}
                              </Box>
                            </Box>
                            ) : null}
                          </Box>
                        ) : null}

                        {isAllocationStep && row.stockLines.length > 1 ? (
                          <Box sx={{ marginTop: 0.75 }}>
                            {row.used <= 0 ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 600 }}
                              >
                                {isSimplifiedMode
                                  ? 'Enter issued to allocate batches'
                                  : 'Enter coverage to allocate batches'}
                              </Typography>
                            ) : null}

                            {row.used > 0 ? (
                              <>
                                <Box
                                  display="grid"
                                  gridTemplateColumns={
                                    workflowStep === 'allocation'
                                      ? 'minmax(220px,2fr) minmax(0,1fr)'
                                      : 'minmax(220px,2fr) repeat(3,minmax(0,1fr))'
                                  }
                                  columnGap={1.25}
                                  rowGap={0.75}
                                  alignItems="center"
                                  sx={{
                                    marginTop: 0.75,
                                    border: '1px solid rgba(0,0,0,0.12)',
                                    borderRadius: 1,
                                    padding: 1,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Batch
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Issued
                                  </Typography>
                                  {workflowStep === 'wastage' ? (
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                      Open vial wastage
                                    </Typography>
                                  ) : null}
                                  {workflowStep === 'wastage' ? (
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                      Wasted
                                    </Typography>
                                  ) : null}

                                  {row.stockLines.map(stockLine => {
                                    const batchDraft = row.batchDraftById?.[stockLine.id] ?? {
                                      used: 0,
                                      wastage: 0,
                                      openVialWastage: row.isVaccine,
                                    };

                                    return (
                                      <React.Fragment key={stockLine.id}>
                                        <Select
                                          size="small"
                                          value={stockLine.id}
                                          disabled
                                          options={batchOptions}
                                        />
                                        {isWastageStep ? (
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              alignSelf: 'center',
                                              justifySelf: 'start',
                                              fontWeight: hasBatchIssuedMismatch ? 700 : undefined,
                                              color: hasBatchIssuedMismatch
                                                ? 'error.main'
                                                : 'text.primary',
                                            }}
                                          >
                                            {batchDraft.used}
                                          </Typography>
                                        ) : (
                                          <BasicTextInput
                                            type="text"
                                            size="small"
                                            inputMode={numericInputMode}
                                            inputProps={numericHtmlInputProps}
                                            slotProps={
                                              hasBatchIssuedMismatch
                                                ? highlightedIssuedInputSlotProps
                                                : undefined
                                            }
                                            sx={compactNumberInputSx}
                                            value={String(batchDraft.used)}
                                            onFocus={selectZeroValueOnFocus}
                                            onChange={event =>
                                              updateBatchUsed(row, stockLine, event.target.value)
                                            }
                                          />
                                        )}
                                        {workflowStep === 'wastage' ? (
                                          <Box
                                            display="flex"
                                            justifyContent="center"
                                            alignItems="center"
                                          >
                                            <Switch
                                              checked={batchDraft.openVialWastage}
                                              disabled={batchDraft.used <= 0}
                                              onChange={(_, checked) =>
                                                updateBatchOpenVialWastage(
                                                  row,
                                                  stockLine,
                                                  checked
                                                )
                                              }
                                            />
                                          </Box>
                                        ) : null}
                                        {workflowStep === 'wastage' ? (
                                          <BasicTextInput
                                            type="text"
                                            size="small"
                                            inputMode={numericInputMode}
                                            inputProps={numericHtmlInputProps}
                                            sx={compactNumberInputSx}
                                            value={String(batchDraft.wastage)}
                                            onFocus={selectZeroValueOnFocus}
                                            onChange={event =>
                                              updateBatchWastage(
                                                row,
                                                stockLine,
                                                event.target.value
                                              )
                                            }
                                          />
                                        ) : null}
                                      </React.Fragment>
                                    );
                                  })}
                                </Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', marginTop: 0.75 }}
                                >
                                  Batch issued total: {batchUsedTotal} / Item issued:{' '}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={
                                      hasBatchIssuedMismatch
                                        ? { fontWeight: 700, color: 'error.main' }
                                        : undefined
                                    }
                                  >
                                    {row.used}
                                  </Typography>
                                </Typography>
                                {hasBatchIssuedMismatch ? (
                                  <Typography
                                    variant="caption"
                                    color="error.main"
                                    sx={{ display: 'block' }}
                                  >
                                    Batch issued total must exactly match item issued.
                                  </Typography>
                                ) : null}
                                {row.stockLines.some(stockLine => {
                                  const batchUsed =
                                    row.batchDraftById?.[stockLine.id]?.used ?? 0;
                                  const availableDisplay = toDisplayUnits(
                                    stockLine.availableNumberOfPacks,
                                    row.isVaccine,
                                    row.doses
                                  );

                                  return batchUsed - availableDisplay > 0.0001;
                                }) ? (
                                  <Typography
                                    variant="caption"
                                    color="error.main"
                                    sx={{ display: 'block' }}
                                  >
                                    One or more batch Issued values exceed that batch stock.
                                  </Typography>
                                ) : null}
                              </>
                            ) : null}
                          </Box>
                        ) : null}
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })
                : null}

              {workflowStep === 'non-vaccine' && allocationNonVaccineRows.length > 0 ? (
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ marginY: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Non-vaccine items
                  </Typography>
                </Box>
              ) : null}

              {workflowStep === 'non-vaccine'
                ? allocationNonVaccineRows.map(row => {
                    const batchOptions = row.stockLines.map(stockLine => ({
                      value: stockLine.id,
                      label: batchLabel(stockLine),
                    }));
                    const batchUsedTotal = sumBatchDraft(row.batchDraftById, 'used');
                    const nonVaccineSohWarning =
                      row.used + row.wastage > row.soh || row.remainingStock < 0;
                    const isExpanded = expandedNonVaccineItemIds[row.itemId] ?? false;
                    const hasValues = row.used > 0 || row.wastage > 0;

                    return (
                      <Box
                        key={row.itemId}
                        sx={{
                          marginBottom: 1.25,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Box
                          role="button"
                          onClick={() =>
                            setExpandedNonVaccineItemIds(previous => ({
                              ...previous,
                              [row.itemId]: !previous[row.itemId],
                            }))
                          }
                          sx={{
                            border: '1px solid rgba(0,0,0,0.12)',
                            backgroundColor: hasValues
                              ? 'rgba(25,118,210,0.10)'
                              : 'background.white',
                            borderRadius: isExpanded ? '4px 4px 0 0' : 1,
                            paddingX: 1.25,
                            paddingY: 1,
                            width: '100%',
                            boxSizing: 'border-box',
                            cursor: 'pointer',
                          }}
                        >
                          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: isExpanded ? 700 : 'normal' }}>
                                {row.item}
                              </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                              {hasValues ? (
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    paddingX: 1.25,
                                    paddingY: 0.5,
                                    borderRadius: 1,
                                    border: '1px solid rgba(0,0,0,0.18)',
                                    backgroundColor: 'rgba(0,0,0,0.03)',
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 700, fontSize: '0.76rem', lineHeight: 1.2 }}
                                  >
                                    Issued: {row.used} | Wasted: {row.wastage}
                                  </Typography>
                                </Box>
                              ) : null}
                              <ChevronDownIcon
                                sx={{
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease',
                                  color: 'text.secondary',
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>

                        {isExpanded ? (
                          <Box
                            sx={{
                              border: '1px solid rgba(0,0,0,0.12)',
                              borderTop: 'none',
                              borderRadius: '0 0 4px 4px',
                              paddingX: 2,
                              paddingY: 1.5,
                            }}
                          >
                            <Box
                              display="grid"
                              gridTemplateColumns="repeat(6,minmax(0,1fr))"
                              columnGap={1.25}
                              rowGap={0.75}
                              alignItems="center"
                              marginTop={0.25}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                SOH
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Batch
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Units
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Issued
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Wasted
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Remaining
                              </Typography>

                              <Typography variant="body2">{row.soh}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {row.stockLines.length > 1
                                  ? 'Needs allocation'
                                  : row.stockLines[0]
                                    ? batchLabel(row.stockLines[0])
                                    : '-'}
                              </Typography>
                              <Typography variant="body2">{row.units}</Typography>
                              <BasicTextInput
                                type="text"
                                size="small"
                                inputMode={numericInputMode}
                                inputProps={numericHtmlInputProps}
                                sx={compactNumberInputSx}
                                value={String(row.used)}
                                onFocus={selectZeroValueOnFocus}
                                onChange={event => updateUsed(row, event.target.value)}
                              />
                              <BasicTextInput
                                type="text"
                                size="small"
                                inputMode={numericInputMode}
                                inputProps={numericHtmlInputProps}
                                sx={compactNumberInputSx}
                                value={String(row.wastage)}
                                onFocus={selectZeroValueOnFocus}
                                onChange={event =>
                                  updateDraft(row.itemId, {
                                    wastage: parseInput(event.target.value),
                                  })
                                }
                              />
                              <Typography variant="body2">{row.remainingStock}</Typography>
                            </Box>

                            {nonVaccineSohWarning ? (
                              <Typography
                                variant="caption"
                                color="error.main"
                                sx={{ display: 'block', marginTop: 0.75, fontWeight: 700 }}
                              >
                                Issued + Wasted exceeds SOH for this item. Reduce the totals so they are less than or equal to SOH.
                              </Typography>
                            ) : null}

                            {row.stockLines.length > 1 ? (
                              <Box sx={{ marginTop: 0.75 }}>
                                {row.used > 0 ? (
                                  <ButtonWithIcon
                                    Icon={
                                      <ChevronDownIcon
                                        sx={{
                                          transform: expandedByItem[row.itemId]
                                            ? 'rotate(180deg)'
                                            : 'rotate(0deg)',
                                          transition: 'transform 0.2s ease',
                                        }}
                                      />
                                    }
                                    label={
                                      expandedByItem[row.itemId]
                                        ? 'Hide batch allocation'
                                        : 'Show batch allocation'
                                    }
                                    onClick={() =>
                                      setExpandedByItem(previous => ({
                                        ...previous,
                                        [row.itemId]: !previous[row.itemId],
                                      }))
                                    }
                                  />
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    Enter issued to allocate batches
                                  </Typography>
                                )}
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', marginTop: 0.25 }}
                                >
                                  {issuedBatchSummary(row) || 'No batches selected yet'}
                                </Typography>

                                {expandedByItem[row.itemId] && row.used > 0 ? (
                                  <>
                                    <Box
                                      display="grid"
                                      gridTemplateColumns="minmax(220px,2fr) repeat(2,minmax(0,1fr))"
                                      columnGap={1.25}
                                      rowGap={0.75}
                                      alignItems="center"
                                      marginTop={0.75}
                                    >
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        Batch
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        Issued
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        Wasted
                                      </Typography>

                                      {row.stockLines.map(stockLine => {
                                        const batchDraft = row.batchDraftById?.[stockLine.id] ?? {
                                          used: 0,
                                          wastage: 0,
                                          openVialWastage: false,
                                        };

                                        return (
                                          <React.Fragment key={stockLine.id}>
                                            <Select
                                              size="small"
                                              value={stockLine.id}
                                              disabled
                                              options={batchOptions}
                                            />
                                            <BasicTextInput
                                              type="text"
                                              size="small"
                                              inputMode={numericInputMode}
                                              inputProps={numericHtmlInputProps}
                                              sx={compactNumberInputSx}
                                              value={String(batchDraft.used)}
                                              onFocus={selectZeroValueOnFocus}
                                              onChange={event =>
                                                updateBatchUsed(row, stockLine, event.target.value)
                                              }
                                            />
                                            <BasicTextInput
                                              type="text"
                                              size="small"
                                              inputMode={numericInputMode}
                                              inputProps={numericHtmlInputProps}
                                              sx={compactNumberInputSx}
                                              value={String(batchDraft.wastage)}
                                              onFocus={selectZeroValueOnFocus}
                                              onChange={event =>
                                                updateBatchWastage(row, stockLine, event.target.value)
                                              }
                                            />
                                          </React.Fragment>
                                        );
                                      })}
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ display: 'block', marginTop: 0.75 }}
                                    >
                                      Batch issued total: {batchUsedTotal} / Item issued: {row.used}
                                    </Typography>
                                    {Math.abs(batchUsedTotal - row.used) > 0.0001 ? (
                                      <Typography
                                        variant="caption"
                                        color="error.main"
                                        sx={{ display: 'block' }}
                                      >
                                        Batch issued total must exactly match item issued.
                                      </Typography>
                                    ) : null}
                                    {row.stockLines.some(stockLine => {
                                      const batchUsed =
                                        row.batchDraftById?.[stockLine.id]?.used ?? 0;
                                      const availableDisplay = toDisplayUnits(
                                        stockLine.availableNumberOfPacks,
                                        row.isVaccine,
                                        row.doses
                                      );

                                      return batchUsed - availableDisplay > 0.0001;
                                    }) ? (
                                      <Typography
                                        variant="caption"
                                        color="error.main"
                                        sx={{ display: 'block' }}
                                      >
                                        One or more batch Issued values exceed that batch stock.
                                      </Typography>
                                    ) : null}
                                  </>
                                ) : null}
                              </Box>
                            ) : null}
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })
                : null}
            </>
          )}
        </Box>
      </Box>
    </>
  );
};
