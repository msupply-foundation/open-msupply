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
  EnvUtils,
  Formatter,
  FnUtils,
  LoadingButton,
  NothingHere,
  Platform,
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
  | 'allocation'
  | 'wastage'
  | 'non-vaccine';
type TallyAgeKey = 'under1' | 'oneToTwo' | 'twoToFive';
type TallyGenderKey = 'male' | 'female' | 'other';

type VaccineSessionTallyDraft = {
  counts: Record<TallyAgeKey, Record<TallyGenderKey, number>>;
};

const tallyAgeGroups: Array<{ key: TallyAgeKey; label: string }> = [
  { key: 'under1', label: 'Under 1 year' },
  { key: 'oneToTwo', label: '1 - 2 years' },
  { key: 'twoToFive', label: '2 - 5 years' },
];

const tallyGenderGroups: Array<{ key: TallyGenderKey; label: string }> = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'other', label: 'Other' },
];

const createEmptySessionTallyDraft = (): VaccineSessionTallyDraft => ({
  counts: {
    under1: { male: 0, female: 0, other: 0 },
    oneToTwo: { male: 0, female: 0, other: 0 },
    twoToFive: { male: 0, female: 0, other: 0 },
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

  const other = vaccineRows.reduce((total, row) => {
    const draft = tallyByItem[row.itemId];
    return (
      total +
      tallyAgeGroups.reduce(
        (ageTotal, { key }) => ageTotal + (draft?.counts[key]?.other ?? 0),
        0
      )
    );
  }, 0);

  return {
    male,
    female,
    other,
    total: male + female + other,
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
    event.target.select();
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
  coverageFieldVisibilityByItem: Record<string, CoverageFieldVisibility>
): CoverageSummaryRow[] => {
  const buckets = resolveDemographicBuckets(demographics);

  return vaccineRows
    .map(row => {
      const coverage = coverageByItem[row.itemId];
      const visibility = coverageFieldVisibilityByItem[row.itemId] ?? {
        showChild: false,
        showWomen: false,
      };
      if (!coverage || !hasVisibleCoverageValues(coverage, visibility)) return null;

      const summary: CoverageSummaryRow = {
        itemId: row.itemId,
        itemName: row.item,
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
    })
    .filter((row): row is CoverageSummaryRow => row !== null)
    .sort((a, b) => a.itemName.localeCompare(b.itemName));
};

const dailyTallyLineNote = (
  row: DailyTallyRow,
  coverage: VaccineCoverageDraft | undefined,
  visibility: CoverageFieldVisibility
) => {
  if (!row.isVaccine) return `Daily tally issued (${row.item})`;

  const payload = coveragePayloadForLine(row, coverage, visibility);
  if (!payload) return `Daily tally issued (${row.item})`;

  return JSON.stringify(payload);
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

const itemTitleSx = {
  fontWeight: 800,
  fontSize: 18,
  color: 'text.primary',
  lineHeight: 1.3,
};

export const DailyTallyView = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const theme = useTheme();
  const isLaptopLayout = useMediaQuery(theme.breakpoints.up('lg'));
  const isSimplifiedTabletUI = useSimplifiedTabletUI();
  const preferences = usePreferences();
  const { useSimplifiedMobileUi = false } = preferences;
  const isSessionTallyStepEnabled = Boolean(
    (preferences as Record<string, unknown>).enableDailyTallySessionTallyStep
  );
  const isSimplifiedMode = isSimplifiedTabletUI || useSimplifiedMobileUi;
  const { error, success } = useNotification();
  const {
    create: { create: createPrescription },
  } = usePrescription();
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();
  const { stocktakeApi } = useStocktakeGraphQL();
  const { masterListApi } = useMasterListGraphQL();
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
  const [sessionTallyByItem, setSessionTallyByItem] = useState<
    Record<string, VaccineSessionTallyDraft>
  >({});
  const [selectedTallyItemId, setSelectedTallyItemId] = useState<string | null>(null);
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
    first: 1,
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
    coverageByItemRef.current = coverageByItem;
  }, [coverageByItem]);

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
  const filteredVaccineRows = useMemo(
    () =>
      normalizedFilterText
        ? vaccineRows.filter(row => row.item.toLowerCase().includes(normalizedFilterText))
        : vaccineRows,
    [normalizedFilterText, vaccineRows]
  );

  useEffect(() => {
    if (!selectedTallyItemId) return;

    const selectedExists = vaccineRows.some(row => row.itemId === selectedTallyItemId);
    if (!selectedExists) {
      setSelectedTallyItemId(null);
    }
  }, [selectedTallyItemId, vaccineRows]);

  const allocationVaccineRows = useMemo(
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
  const allocationNonVaccineRows = nonVaccineRows;
  const hasNonVaccineItems = allocationNonVaccineRows.length > 0;
  const workflowStepSequence = useMemo(() => {
    const sequence: WorkflowStep[] = [];
    if (isSessionTallyStepEnabled) sequence.push('tally');
    if (!isSimplifiedMode) sequence.push('coverage');
    sequence.push('allocation');
    sequence.push('wastage');
    if (hasNonVaccineItems) sequence.push('non-vaccine');
    return sequence;
  }, [hasNonVaccineItems, isSessionTallyStepEnabled, isSimplifiedMode]);

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
  const shouldCollapseAllocationStepInTitle =
    !isSimplifiedMode &&
    workflowStep !== 'allocation' &&
    workflowStepSequence.includes('allocation') &&
    !hasAnyCoveredMultiBatchVaccines;
  const workflowDisplayStepSequence = workflowStepSequence.filter(step => {
    if (shouldCollapseAllocationStepInTitle && step === 'allocation') return false;
    return true;
  });

  const workflowStepIndex = Math.max(workflowDisplayStepSequence.indexOf(workflowStep), 0);
  const workflowStepTotal = workflowDisplayStepSequence.length;
  const workflowStepTitleByKey: Record<WorkflowStep, string> = {
    tally: 'Vaccine Session Tally',
    coverage: 'Coverage',
    allocation: 'Vaccine Batch Allocation',
    wastage: 'Open Vial Wastage',
    'non-vaccine': 'Non-vaccine Issuance',
  };
  const workflowStepBreadcrumbLabel = `Step ${workflowStepIndex + 1} of ${workflowStepTotal}: ${workflowStepTitleByKey[workflowStep]}`;
  const allocationStepRows = useSimplifiedMobileUi
    ? allocationVaccineRows
    : allocationVaccineRows.filter(row => row.stockLines.length > 1);
  const displayedVaccineRows =
    workflowStep === 'coverage'
      ? filteredVaccineRows
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
        coverageFieldVisibilityByItem
      ),
    [rows, coverageByItem, demographicData?.nodes, coverageFieldVisibilityByItem]
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
    draft: VaccineSessionTallyDraft
  ) => {
    if (isSimplifiedMode) return;

    const currentCoverage =
      coverageByItemRef.current[row.itemId] ?? defaultVaccineCoverageDraft(coverageTemplate);

    const nextCoverage: VaccineCoverageDraft = {
      ...currentCoverage,
      childAgeGroups: currentCoverage.childAgeGroups.map((group, index) => {
        const mapKeyByIndex: Record<number, TallyAgeKey> = {
          0: 'under1',
          1: 'oneToTwo',
          2: 'twoToFive',
        };
        const mappedAgeKey = mapKeyByIndex[index];
        if (!mappedAgeKey) return group;

        return {
          ...group,
          male: draft.counts[mappedAgeKey].male,
          female: draft.counts[mappedAgeKey].female,
        };
      }),
      womenAgeGroups: currentCoverage.womenAgeGroups.map(group => ({
        ...group,
        count: 0,
      })),
    };

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
    delta: 1 | -1
  ) => {
    setSessionTallyByItem(previous => {
      const currentDraft = previous[row.itemId] ?? createEmptySessionTallyDraft();
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

      applyUsedValue(row, sessionTallyVaccineTotal(nextDraft));
      syncCoverageFromSessionTally(row, nextDraft);

      return {
        ...previous,
        [row.itemId]: nextDraft,
      };
    });
  };

  const resetSessionTally = () => {
    const hasValues = vaccineRows.some(
      row => sessionTallyVaccineTotal(sessionTallyByItem[row.itemId]) > 0
    );

    if (!hasValues) return;

    const confirmed = window.confirm('Reset all vaccine session tally counts for this day?');
    if (!confirmed) return;

    const nextTallyByItem: Record<string, VaccineSessionTallyDraft> = {};
    for (const row of vaccineRows) {
      const emptyDraft = createEmptySessionTallyDraft();
      nextTallyByItem[row.itemId] = emptyDraft;
      applyUsedValue(row, 0);
      syncCoverageFromSessionTally(row, emptyDraft);
    }

    setSessionTallyByItem(nextTallyByItem);
    setSelectedTallyItemId(null);
  };

  const moveToAllocationStep = () => {
    if (!selectedPatientId) {
      error('Select Daily Tally (patient) before continuing to Batches.')();
      return;
    }

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

    setWorkflowStep('allocation');
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

      if (!skipDuplicateWarning && (sameDayTallyData?.totalCount ?? 0) > 0) {
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
          const lineNote = dailyTallyLineNote(
            row,
            coverageByItem[row.itemId],
            coverageFieldVisibilityByItem[row.itemId] ?? {
              showChild: false,
              showWomen: false,
            }
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
            const lineNote = dailyTallyLineNote(
              row,
              coverageByItem[row.itemId],
              coverageFieldVisibilityByItem[row.itemId] ?? {
                showChild: false,
                showWomen: false,
              }
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
    xs: 'minmax(160px,2fr) repeat(7,minmax(0,1fr))',
    sm: 'minmax(190px,2fr) repeat(7,minmax(0,1fr))',
    md: 'minmax(220px,2fr) repeat(7,minmax(0,1fr))',
    lg: 'minmax(260px,2.1fr) repeat(7,minmax(0,1fr))',
  } as const;

  const womenCoverageGridTemplateColumns = {
    xs: 'minmax(160px,2fr) repeat(3,minmax(0,1fr))',
    sm: 'minmax(190px,2fr) repeat(3,minmax(0,1fr))',
    md: 'minmax(220px,2fr) repeat(3,minmax(0,1fr))',
    lg: 'minmax(260px,2.1fr) repeat(3,minmax(0,1fr))',
  } as const;

  const summaryPrintMarkup = useMemo(() => {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const summaryRowsHtml = confirmSummaryRows
      .map(
        row => `
          <tr>
            <td>${escapeHtml(row.item)}</td>
            <td>${escapeHtml(row.batch)}</td>
            <td>${escapeHtml(row.issued)}</td>
            <td>${escapeHtml(row.wastage)}</td>
          </tr>
        `
      )
      .join('');

    const coverageRowsHtml = childCoverageSummaryRows
      .map(row => {
        const childTotal =
          row.childUnderOneMale +
          row.childUnderOneFemale +
          row.childOneToTwoMale +
          row.childOneToTwoFemale +
          row.childTwoToFiveMale +
          row.childTwoToFiveFemale;

        return `
          <tr>
            <td>${escapeHtml(row.itemName)}</td>
            <td>${row.childUnderOneMale}</td>
            <td>${row.childUnderOneFemale}</td>
            <td>${row.childOneToTwoMale}</td>
            <td>${row.childOneToTwoFemale}</td>
            <td>${row.childTwoToFiveMale}</td>
            <td>${row.childTwoToFiveFemale}</td>
            <td><strong>${childTotal}</strong></td>
          </tr>
        `;
      })
      .join('');

    const womenRowsHtml = womenCoverageSummaryRows
      .map(row => `
        <tr>
          <td>${escapeHtml(row.itemName)}</td>
          <td>${row.womenPregnant}</td>
          <td>${row.womenNonPregnant}</td>
          <td><strong>${row.womenPregnant + row.womenNonPregnant}</strong></td>
        </tr>
      `)
      .join('');

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
        .daily-tally-summary-print table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; page-break-inside: auto; }
        .daily-tally-summary-print thead { display: table-header-group; }
        .daily-tally-summary-print tfoot { display: table-footer-group; }
        .daily-tally-summary-print tr { page-break-inside: avoid; break-inside: avoid; }
        .daily-tally-summary-print th, .daily-tally-summary-print td { border: 1px solid #e5e7eb; padding: 4px 6px; font-size: 11px; white-space: normal; word-break: break-word; overflow-wrap: anywhere; }
        .daily-tally-summary-print th { background: #f3f4f6; text-align: center; font-weight: 700; }
        .daily-tally-summary-print td:first-child,
        .daily-tally-summary-print th:first-child { text-align: left; width: 28%; }
        .daily-tally-summary-print td:not(:first-child) { text-align: center; }
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
          <h2>Item Batch Issued Wastage</h2>
          <table>
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
              <thead>
                <tr>
                  <th>Vaccine</th>
                  <th>U1 Male</th>
                  <th>U1 Female</th>
                  <th>1-2 Male</th>
                  <th>1-2 Female</th>
                  <th>2-5 Male</th>
                  <th>2-5 Female</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${coverageRowsHtml}</tbody>
            </table>
          </div>
        ` : ''}

        ${womenCoverageSummaryRows.length > 0 ? `
          <div class="print-section">
            <h2>Coverage Summary (Women vaccination)</h2>
            <table>
              <thead>
                <tr><th>Vaccine</th><th>Pregnant</th><th>Non pregnant</th><th>Total</th></tr>
              </thead>
              <tbody>${womenRowsHtml}</tbody>
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
    coverage: 'Back to Session Tally',
    allocation: 'Back to Coverage',
    wastage: 'Back to Batches',
    'non-vaccine': 'Back to Vaccines',
  };
  const backButtonLabel = previousWorkflowStep
    ? workflowStep === 'wastage' && !hasAnyCoveredMultiBatchVaccines
      ? 'Back to Coverage'
      : backButtonLabelByStep[workflowStep]
    : 'Back';
  const hasAnyCoverageValues = vaccineRows.some(row =>
    hasVisibleCoverageValues(
      coverageByItem[row.itemId],
      coverageFieldVisibilityByItem[row.itemId] ?? {
        showChild: false,
        showWomen: false,
      }
    )
  );

  const continueButtonLabel =
    workflowStep === 'tally'
      ? nextWorkflowStep === 'coverage'
        ? 'Continue to Coverage'
        : 'Continue to Batches'
      : workflowStep === 'coverage'
        ? hasAnyCoverageValues
          ? hasAnyCoveredMultiBatchVaccines
            ? 'Continue to Batches'
            : 'Continue to Open Vial Wastage'
          : 'Continue to Non-vaccine'
        : workflowStep === 'allocation'
          ? 'Continue to Open Vial Wastage'
          : workflowStep === 'wastage'
          ? nextWorkflowStep === 'non-vaccine'
            ? 'Continue to Non-vaccine'
            : 'Confirm'
          : 'Confirm';

  const continueButtonIsFinal = !nextWorkflowStep;

  const sessionGrandTotals = sessionTallyGenderTotals(sessionTallyByItem, vaccineRows);
  const selectedTallyRow = selectedTallyItemId
    ? vaccineRows.find(row => row.itemId === selectedTallyItemId) ?? null
    : null;
  const selectedTallyDraft = selectedTallyRow
    ? sessionTallyByItem[selectedTallyRow.itemId] ?? createEmptySessionTallyDraft()
    : null;

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
            isLoading={isSaving}
            onClick={async () => await onConfirm(true)}
          />
        }
        cancelButton={
          <DialogButton variant="cancel" onClick={() => setConfirmSummaryOpen(false)} />
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
              onClick={onPrintSummary}
              sx={{ paddingX: 1.25, paddingY: 0.5 }}
            />
            {EnvUtils.platform !== Platform.Android && (
              <ButtonWithIcon
                Icon={<DownloadIcon />}
                label={t('button.download-pdf')}
                onClick={onDownloadPdfSummary}
              />
            )}
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

              {isLaptopLayout ? (
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
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              textAlign: 'center',
                              gridColumn: '2 / span 2',
                            }}
                          >
                            Children under 1 years
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              textAlign: 'center',
                              gridColumn: '4 / span 2',
                            }}
                          >
                            Children 1 to 2 years
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              textAlign: 'center',
                              gridColumn: '6 / span 2',
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
                            key={`child-${coverageRow.itemId}`}
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
                            <Typography variant="body2">{coverageRow.itemName}</Typography>
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
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                textAlign: 'center',
                                gridColumn: '2 / span 2',
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
                              key={`women-${coverageRow.itemId}`}
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
                              <Typography variant="body2">{coverageRow.itemName}</Typography>
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
                        key={`compact-${coverageRow.itemId}`}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          padding: 1,
                          backgroundColor: 'background.white',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 700, marginBottom: 0.75 }}>
                          {coverageRow.itemName}
                        </Typography>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(2,minmax(0,1fr))"
                          columnGap={1}
                          rowGap={0.5}
                        >
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
                </Stack>
              )}
            </Box>
          ) : null}
        </Stack>
      </ConfirmSummaryModal>

      <DuplicateWarningModal
        title={'Daily tally already exists'}
        okButton={
          <DialogButton
            variant="ok"
            onClick={async () => {
              setDuplicateWarningOpen(false);
              await onConfirm(true, true);
            }}
          />
        }
        cancelButton={
          <DialogButton variant="cancel" onClick={() => setDuplicateWarningOpen(false)} />
        }
      >
        <Typography variant="body2" color="text.secondary">
          A daily tally sheet already exists for today. Do you want to create another one for the same day?
        </Typography>
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
          <BasicTextInput
            size="small"
            placeholder={t('placeholder.filter-items')}
            value={filterText}
            onChange={event => setFilterText(event.target.value)}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Box>
      </AppBarContentPortal>

      <AppBarButtonsPortal>
        {hasPreviousWorkflowStep ? (
          <LoadingButton
            label={backButtonLabel}
            startIcon={<ArrowLeftIcon />}
            color="secondary"
            variant="outlined"
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
          label={continueButtonLabel}
          color="secondary"
          variant="contained"
          onClick={moveToNextWorkflowStep}
          isLoading={
            continueButtonIsFinal ? isSaving : false
          }
        />
      </AppBarButtonsPortal>

      <Box paddingBottom={2}>
        <Box sx={{ paddingX: 2, paddingBottom: 1, width: '100%', boxSizing: 'border-box' }}>
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
              body={
                filterText
                  ? 'No stock items match the current filter.'
                  : 'No stock items are available for Daily Tally.'
              }
            />
          ) : workflowStep === 'coverage' && filterText && displayedVaccineRows.length === 0 ? (
            <NothingHere body="No vaccine items match the current filter." />
          ) : (
            <>
              {workflowStep === 'tally' ? (
                <>
                  <Box
                    sx={{
                      border: '1px solid rgba(0,0,0,0.12)',
                      borderRadius: 1,
                      padding: 1.25,
                      marginBottom: 1.25,
                      backgroundColor: 'background.menu',
                    }}
                  >
                    <Box
                      display="grid"
                      gridTemplateColumns={{ xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,minmax(0,1fr))' }}
                      gap={1}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">Male</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{sessionGrandTotals.male}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Female</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{sessionGrandTotals.female}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Other</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{sessionGrandTotals.other}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{sessionGrandTotals.total}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {selectedTallyRow && selectedTallyDraft ? (
                    <Box
                      sx={{
                        border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 1,
                        padding: 1.5,
                        marginBottom: 1.25,
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                        <ButtonWithIcon
                          Icon={<ArrowLeftIcon />}
                          label="Back to Vaccine List"
                          onClick={() => setSelectedTallyItemId(null)}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 800 }}>
                          Total for {selectedTallyRow.item}: {sessionTallyVaccineTotal(selectedTallyDraft)}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          marginTop: 1.25,
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          overflowX: 'auto',
                        }}
                      >
                        <Box
                          display="grid"
                          gridTemplateColumns="minmax(140px,1.8fr) repeat(3,minmax(0,1fr)) minmax(96px,0.9fr)"
                          columnGap={0.75}
                          rowGap={0.75}
                          alignItems="center"
                          sx={{ padding: 1.25 }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>Age</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }}>Male</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }}>Female</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }}>Other</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }}>Total</Typography>

                          {tallyAgeGroups.map(({ key, label }) => {
                            const maleCount = selectedTallyDraft.counts[key].male;
                            const femaleCount = selectedTallyDraft.counts[key].female;
                            const otherCount = selectedTallyDraft.counts[key].other;
                            const rowTotal = maleCount + femaleCount + otherCount;

                            return (
                              <React.Fragment key={key}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
                                {tallyGenderGroups.map(({ key: genderKey }) => {
                                  const value = selectedTallyDraft.counts[key][genderKey];
                                  return (
                                    <Box
                                      key={`${key}-${genderKey}`}
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      gap={0.5}
                                    >
                                      <ButtonWithIcon
                                        label="-"
                                        onClick={() =>
                                          updateSessionTallyCell(
                                            selectedTallyRow,
                                            key,
                                            genderKey,
                                            -1
                                          )
                                        }
                                        sx={{ minWidth: 44, height: 44, paddingX: 0.75 }}
                                      />
                                      <ButtonWithIcon
                                        label={value > 0 ? String(value) : '+'}
                                        onClick={() =>
                                          updateSessionTallyCell(
                                            selectedTallyRow,
                                            key,
                                            genderKey,
                                            1
                                          )
                                        }
                                        sx={{
                                          minWidth: 72,
                                          height: 50,
                                          paddingX: 1,
                                          backgroundColor:
                                            value > 0 ? 'rgba(25,118,210,0.12)' : undefined,
                                          border: value > 0 ? '1px solid rgba(25,118,210,0.35)' : undefined,
                                        }}
                                      />
                                    </Box>
                                  );
                                })}
                                <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 700 }}>
                                  {rowTotal}
                                </Typography>
                              </React.Fragment>
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ marginY: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          Vaccines
                        </Typography>
                        <ButtonWithIcon label="Reset day" onClick={resetSessionTally} />
                      </Box>

                      <Box
                        display="grid"
                        gridTemplateColumns={{ xs: '1fr', sm: 'repeat(auto-fit,minmax(280px,1fr))' }}
                        columnGap={1.25}
                        sx={{ width: '100%' }}
                      >
                        {vaccineRows.map(row => {
                          const total = sessionTallyVaccineTotal(sessionTallyByItem[row.itemId]);

                          return (
                            <Box
                              key={`tally-card-${row.itemId}`}
                              role="button"
                              onClick={() => setSelectedTallyItemId(row.itemId)}
                              sx={{
                                border: total > 0
                                  ? '1px solid rgba(25,118,210,0.38)'
                                  : '1px solid rgba(0,0,0,0.12)',
                                backgroundColor:
                                  total > 0 ? 'rgba(25,118,210,0.10)' : 'background.white',
                                borderRadius: 1,
                                paddingX: 1.25,
                                paddingY: 1,
                                marginBottom: 1,
                                width: '100%',
                                boxSizing: 'border-box',
                                cursor: 'pointer',
                              }}
                            >
                              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                                {row.item}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Daily total: {total}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}
                </>
              ) : null}

              {displayedVaccineRows.length > 0 ? (
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ marginY: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {workflowStep === 'coverage'
                      ? 'Vaccine coverage'
                      : 'Vaccine items'}
                  </Typography>
                </Box>
              ) : null}

              {isVaccineBucketOpen
                ? displayedVaccineRows.map(row => {
                    const coverage =
                      coverageByItem[row.itemId] ?? defaultVaccineCoverageDraft(coverageTemplate);
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
                    const shouldHighlightUpperIssuedValue =
                      (isAllocationStep || isWastageStep) &&
                      row.stockLines.length > 1 &&
                      hasBatchIssuedMismatch;

                    return (
                      <Box
                        key={row.itemId}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          paddingX: 2,
                          paddingY: 1.5,
                          marginBottom: 1.25,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                          <Typography variant="body1" sx={itemTitleSx}>
                            {row.item}
                          </Typography>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="flex-end"
                            gap={1}
                            flexWrap="wrap"
                          >
                            {!isSimplifiedMode && workflowStep === 'allocation' ? (
                              <ButtonWithIcon
                                Icon={
                                  <ChevronDownIcon
                                    sx={{
                                      transform: coverage.isOpen
                                        ? 'rotate(180deg)'
                                        : 'rotate(0deg)',
                                      transition: 'transform 0.2s ease',
                                    }}
                                  />
                                }
                                label={coverage.isOpen ? 'Hide coverage' : 'Show coverage'}
                                onClick={() =>
                                  updateCoverageForRow(row, current => ({
                                    ...current,
                                    isOpen: !current.isOpen,
                                  }))
                                }
                              />
                            ) : null}
                            {workflowStep !== 'allocation' && workflowStep !== 'wastage' ? (
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
                                  sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}
                                >
                                  Issued doses: {row.used}
                                </Typography>
                              </Box>
                            ) : null}
                          </Box>
                        </Box>

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

                        {(workflowStep === 'coverage' || (!isSimplifiedMode && coverage.isOpen)) ? (
                          <Box sx={{ marginTop: 1 }}>
                            {coverageVisibility.showChild ? (
                            <Box
                              sx={{
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

                                {coverage.childAgeGroups.map(ageGroup => (
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
                                        updateCoverageForRow(row, current => ({
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
                                        updateCoverageForRow(row, current => ({
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
                                    resolveWomenCoverageGroups(coverage.womenAgeGroups);
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
                                        updateCoverageForRow(row, current => ({
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
                                          updateCoverageForRow(row, current => ({
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
                            {issuedBatchSummary(row) ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', marginTop: 0.25 }}
                              >
                                {issuedBatchSummary(row)}
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
                                  marginTop={0.75}
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

                    return (
                      <Box
                        key={row.itemId}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          paddingX: 2,
                          paddingY: 1.5,
                          marginBottom: 1.25,
                          width: '100%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Typography variant="body1" sx={itemTitleSx}>
                          {row.item}
                        </Typography>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(6,minmax(0,1fr))"
                          columnGap={1.25}
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
                            onChange={event => updateUsed(row, event.target.value)}
                          />
                          <BasicTextInput
                            type="text"
                            size="small"
                            inputMode={numericInputMode}
                            inputProps={numericHtmlInputProps}
                            sx={compactNumberInputSx}
                            value={String(row.wastage)}
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
