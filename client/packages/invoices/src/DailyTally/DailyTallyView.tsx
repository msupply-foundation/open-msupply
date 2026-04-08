import React, { useEffect, useMemo, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  AppBarButtonsPortal,
  AppBarContentPortal,
  BasicTextInput,
  Box,
  ButtonWithIcon,
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
import { usePrescription, usePrescriptionList } from '../Prescriptions/api';
import { usePrescriptionGraphQL } from '../Prescriptions/api/usePrescriptionGraphQL';
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

const isNonPregnantWomenGroup = (group: WomenCoverageAgeGroup) => {
  const key = `${group.id} ${group.label}`.toLowerCase();
  return key.includes('non-pregnant') || key.includes('non pregnant');
};

const isPregnantWomenGroup = (group: WomenCoverageAgeGroup) => {
  const key = `${group.id} ${group.label}`.toLowerCase();
  return key.includes('pregnant') && !isNonPregnantWomenGroup(group);
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
  const buckets = resolveDemographicBuckets(demographics);

  return {
    childAgeGroups: [
      { id: buckets.child011.id, label: buckets.child011.name, male: 0, female: 0 },
      { id: buckets.child12.id, label: buckets.child12.name, male: 0, female: 0 },
      { id: buckets.child25.id, label: buckets.child25.name, male: 0, female: 0 },
    ],
    womenAgeGroups: [
      {
        id: buckets.womenNonPregnant.id,
        label: buckets.womenNonPregnant.name,
        count: 0,
      },
      { id: buckets.womenPregnant.id, label: buckets.womenPregnant.name, count: 0 },
    ],
  };
};

const defaultVaccineCoverageDraft = (): VaccineCoverageDraft => {
  return {
    isOpen: false,
    childAgeGroups: defaultChildCoverageAgeGroups(),
    womenAgeGroups: defaultWomenCoverageAgeGroups(),
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
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  return `daily tally-${day}/${month}/${year}`;
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

const getCoverageUsedTotal = (coverage: VaccineCoverageDraft | undefined) => {
  if (!coverage) return 0;

  const childTotal = coverage.childAgeGroups.reduce(
    (total, ageGroup) => total + ageGroup.male + ageGroup.female,
    0
  );
  const womenTotal = coverage.womenAgeGroups.reduce(
    (total, ageGroup) => total + ageGroup.count,
    0
  );

  return childTotal + womenTotal;
};

const hasCoverageValues = (coverage: VaccineCoverageDraft | undefined) => {
  if (!coverage) return false;

  const childValues = coverage.childAgeGroups.some(
    ageGroup => ageGroup.male > 0 || ageGroup.female > 0
  );
  const womenValues = coverage.womenAgeGroups.some(ageGroup => ageGroup.count > 0);

  return childValues || womenValues;
};

const coverageSummaryText = (
  vaccineRows: DailyTallyRow[],
  coverageByItem: Record<string, VaccineCoverageDraft>
) => {
  const lines = vaccineRows.flatMap(row => {
    const coverage = coverageByItem[row.itemId];
    if (!hasCoverageValues(coverage)) return [];
    if (!coverage) return [];

    const childSummary = coverage.childAgeGroups
      .filter(group => group.male > 0 || group.female > 0)
      .map(group => `${group.label} M:${group.male} F:${group.female}`)
      .join(' ; ');
    const womenSummary = coverage.womenAgeGroups
      .filter(group => group.count > 0)
      .map(group => `${group.label} ${group.count}`)
      .join(' ; ');

    return [
      `${row.item} => Child: ${childSummary || '0'} | Women: ${womenSummary || '0'}`,
    ];
  });

  return lines.join(' || ');
};

const coveragePayloadForLine = (
  row: DailyTallyRow,
  coverage: VaccineCoverageDraft | undefined
) => {
  if (!coverage || !hasCoverageValues(coverage)) return null;

  return {
    version: 'DT_COVERAGE_V1',
    itemId: row.itemId,
    itemName: row.item,
    child: coverage.childAgeGroups.map(group => ({
      groupId: group.id,
      groupName: group.label,
      male: group.male,
      female: group.female,
    })),
    women: coverage.womenAgeGroups.map(group => ({
      groupId: group.id,
      groupName: group.label,
      count: group.count,
    })),
  };
};

const buildCoverageSummaryRows = (
  vaccineRows: DailyTallyRow[],
  coverageByItem: Record<string, VaccineCoverageDraft>,
  demographics: DemographicNodeLite[] | undefined
): CoverageSummaryRow[] => {
  const buckets = resolveDemographicBuckets(demographics);

  return vaccineRows
    .map(row => {
      const coverage = coverageByItem[row.itemId];
      if (!coverage || !hasCoverageValues(coverage)) return null;

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

      for (const women of coverage.womenAgeGroups) {
        if (isWomenNonPregnantBucket(women.id, women.label, buckets)) {
          summary.womenNonPregnant += women.count;
          continue;
        }

        if (isWomenPregnantBucket(women.id, women.label, buckets)) {
          summary.womenPregnant += women.count;
        }
      }

      return summary;
    })
    .filter((row): row is CoverageSummaryRow => row !== null)
    .sort((a, b) => a.itemName.localeCompare(b.itemName));
};

const dailyTallyLineNote = (
  row: DailyTallyRow,
  coverage: VaccineCoverageDraft | undefined
) => {
  if (!row.isVaccine) return `Daily tally used (${row.item})`;

  const payload = coveragePayloadForLine(row, coverage);
  if (!payload) return `Daily tally used (${row.item})`;

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

const getSuggestedOpenVialWastage = ({
  soh,
  used,
  isVaccine,
  doses,
}: Pick<DailyTallyRow, 'soh' | 'used' | 'isVaccine' | 'doses'>) => {
  if (!isVaccine || doses <= 0 || used <= 0) return null;

  const stockOnHand = round(soh);
  const administered = round(used);
  const openRemainderFromStock = round(stockOnHand % doses);

  if (administered <= openRemainderFromStock) {
    return 0;
  }

  const fromNewVials = round(administered - openRemainderFromStock);
  const remainder = round(fromNewVials % doses);
  if (remainder === 0) return 0;

  return round(doses - remainder);
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
  const theme = useTheme();
  const isLaptopLayout = useMediaQuery(theme.breakpoints.up('lg'));
  const isSimplifiedTabletUI = useSimplifiedTabletUI();
  const { useSimplifiedMobileUi = false } = usePreferences();
  const isSimplifiedMode = isSimplifiedTabletUI || useSimplifiedMobileUi;
  const { error, success } = useNotification();
  const {
    create: { create: createPrescription },
  } = usePrescription();
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();
  const { stocktakeApi } = useStocktakeGraphQL();
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
  const [isVaccineBucketOpen, setIsVaccineBucketOpen] = useState(true);
  const [isNonVaccineBucketOpen, setIsNonVaccineBucketOpen] = useState(true);
  const [coverageByItem, setCoverageByItem] = useState<
    Record<string, VaccineCoverageDraft>
  >({});
  const [isSaving, setIsSaving] = useState(false);

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
      theirReference: { like: 'daily tally-' },
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
        label: patient.code ? `${patient.name} (${patient.code})` : patient.name,
      })),
    [patientData?.nodes]
  );

  const selectedPatientLabel = useMemo(() => {
    return (
      patientOptions.find(option => option.value === selectedPatientId)?.label ||
      'Not selected'
    );
  }, [patientOptions, selectedPatientId]);

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
        ...(filterText ? { search: { like: filterText } } : {}),
      },
    }),
    [filterText]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: itemApi.keys.paramList(itemQueryParams),
    queryFn: () => itemApi.get.stockItemsWithStockLines(itemQueryParams),
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
      .filter(item => item.stockLines.length > 0)
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
  const confirmCoverageRows = useMemo(
    () =>
      buildCoverageSummaryRows(
        rows.filter(row => row.isVaccine && row.used > 0),
        coverageByItem,
        demographicData?.nodes
      ),
    [rows, coverageByItem, demographicData?.nodes]
  );

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
    let nextCoverage = defaultVaccineCoverageDraft();

    setCoverageByItem(previous => {
      const current = previous[row.itemId] ?? defaultVaccineCoverageDraft();
      nextCoverage = updater(current);
      return {
        ...previous,
        [row.itemId]: nextCoverage,
      };
    });

    applyUsedValue(row, getCoverageUsedTotal(nextCoverage));
  };

  const updateOpenVialWastage = (row: DailyTallyRow, checked: boolean) => {
    const nextChecked = row.isVaccine ? checked : false;
    const suggested = nextChecked ? getSuggestedOpenVialWastage(row) : null;

    updateDraft(row.itemId, {
      openVialWastage: nextChecked,
      ...(nextChecked && suggested !== null ? { wastage: suggested } : {}),
    });
  };

  const batchSuggestion = (row: DailyTallyRow, used: number) => {
    if (!row.isVaccine || row.doses <= 0 || used <= 0) return 0;

    const remainder = round(used % row.doses);
    if (remainder === 0) return 0;

    return round(row.doses - remainder);
  };

  const batchCalculatedWastage = (
    row: DailyTallyRow,
    _stockLine: TallyStockLine,
    used: number,
    isOpenVialWastage: boolean
  ) => {
    if (!isOpenVialWastage) return 0;
    if (used <= 0) return 0;
    return batchSuggestion(row, used);
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
        `Used for batch ${batchLabel(stockLine)} cannot exceed available ${availableDisplay}.`
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
        ? batchSuggestion(row, used)
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
          used: sumBatchDraft(nextBatchDraftById, 'used'),
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
        ? batchSuggestion(row, currentBatchDraft.used)
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
          used: sumBatchDraft(nextBatchDraftById, 'used'),
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
          used: sumBatchDraft(nextBatchDraftById, 'used'),
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
        error('Enter used or wastage values before confirming')();
        return;
      }

      const invalid = activeRows.find(
        row => row.used + row.wastage > row.soh || row.remainingStock < 0
      );
      if (invalid) {
        error(`Invalid input for ${invalid.item}: Used + Wastage must be <= SOH`)();
        return;
      }

      const usedRows = activeRows.filter(row => row.used > 0);
      const wastageRows = activeRows.filter(row => row.wastage > 0);
      const vaccineRowsWithUse = usedRows.filter(row => row.isVaccine);
      const coverageSummary = coverageSummaryText(vaccineRowsWithUse, coverageByItem);
      const vaccineWastageRows = wastageRows.filter(row => row.isVaccine);
      const nonVaccineWastageRows = wastageRows.filter(row => !row.isVaccine);

      const tooSmallUsedRow = usedRows.find(
        row => toPacks(row.used, row.isVaccine, row.doses) <= 0
      );
      if (tooSmallUsedRow) {
        error(`Used value for ${tooSmallUsedRow.item} is too small to allocate stock lines.`)();
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
          `For ${invalidMultiBatchUsed.item}, batch Used is mandatory and must equal row Used.`
        )();
        return;
      }

      if (invalidMultiBatchCapacity) {
        error(
          `For ${invalidMultiBatchCapacity.item}, one or more batch Used values exceed that batch stock.`
        )();
        return;
      }

      if (usedRows.length > 0 && !selectedPatientId) {
        error('Select a patient before confirming used quantities')();
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

      const hasVaccineUse = usedRows.some(row => row.isVaccine);
      if (hasVaccineUse && !isSimplifiedMode) {
        const missingCoverageRow = vaccineRowsWithUse.find(
          row => !hasCoverageValues(coverageByItem[row.itemId])
        );
        if (missingCoverageRow) {
          error(`Enter coverage for ${missingCoverageRow.item}.`)();
          return;
        }
      }

      if (hasVaccineUse && !coverageSummary && !isSimplifiedMode) {
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
          const lineNote = dailyTallyLineNote(row, coverageByItem[row.itemId]);

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
            const lineNote = dailyTallyLineNote(row, coverageByItem[row.itemId]);
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
            'Could not create daily tally prescription lines. Check used values and batch allocation.'
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
        `Daily tally confirmed (Used: ${totalUsed}, Wastage: ${totalWastage})`
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
    xs: 'minmax(150px,1.8fr) minmax(100px,1fr) minmax(90px,0.9fr) minmax(90px,0.9fr)',
    sm: 'minmax(200px,2fr) minmax(130px,1fr) minmax(110px,1fr) minmax(110px,1fr)',
    md: 'minmax(280px,2fr) minmax(170px,1fr) minmax(140px,1fr) minmax(140px,1fr)',
    lg: 'minmax(340px,2.2fr) minmax(220px,1.2fr) minmax(170px,1fr) minmax(170px,1fr)',
  } as const;

  const childCoverageGridTemplateColumns = {
    xs: 'minmax(160px,1.8fr) repeat(7,minmax(56px,0.8fr))',
    sm: 'minmax(190px,2fr) repeat(7,minmax(72px,0.9fr))',
    md: 'minmax(250px,2.1fr) repeat(7,minmax(96px,1fr))',
    lg: 'minmax(320px,2.3fr) repeat(7,minmax(120px,1fr))',
  } as const;

  const womenCoverageGridTemplateColumns = {
    xs: 'minmax(160px,1.8fr) repeat(3,minmax(80px,1fr))',
    sm: 'minmax(190px,2fr) repeat(3,minmax(100px,1fr))',
    md: 'minmax(250px,2.1fr) repeat(3,minmax(130px,1fr))',
    lg: 'minmax(320px,2.3fr) repeat(3,minmax(170px,1fr))',
  } as const;
  const hasWomenCoverageSummary = confirmCoverageRows.some(
    row => row.womenPregnant > 0 || row.womenNonPregnant > 0
  );

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

    const coverageRowsHtml = confirmCoverageRows
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

    const womenRowsHtml = confirmCoverageRows
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
        .daily-tally-summary-print { font-family: Arial, sans-serif; color: #111827; padding: 20px; }
        .daily-tally-summary-print h1 { margin: 0; font-size: 21px; }
        .daily-tally-summary-print .meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 10px 0 14px; }
        .daily-tally-summary-print .meta-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
        .daily-tally-summary-print .meta-label { font-size: 11px; color: #6b7280; }
        .daily-tally-summary-print .meta-value { font-size: 13px; margin-top: 2px; word-break: break-word; }
        .daily-tally-summary-print h2 { font-size: 15px; margin: 14px 0 8px; }
        .daily-tally-summary-print table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .daily-tally-summary-print th, .daily-tally-summary-print td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; }
        .daily-tally-summary-print th { background: #f3f4f6; text-align: center; font-weight: 700; }
        .daily-tally-summary-print td:first-child { text-align: left; }
        .daily-tally-summary-print td:not(:first-child) { text-align: center; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .daily-tally-summary-print { padding: 6mm; }
        }
      </style>
      <div class="daily-tally-summary-print">
        <h1>Daily Tally Summary</h1>
        <div class="meta">
          <div class="meta-card"><div class="meta-label">Reference</div><div class="meta-value">${escapeHtml(tallyReference)}</div></div>
          <div class="meta-card"><div class="meta-label">Patient</div><div class="meta-value">${escapeHtml(selectedPatientLabel || '-')}</div></div>
          <div class="meta-card"><div class="meta-label">Lines</div><div class="meta-value">${confirmSummaryRows.length}</div></div>
        </div>

        <h2>Item Batch Issued Wastage</h2>
        <table>
          <thead>
            <tr><th>Item</th><th>Batch</th><th>Issued</th><th>Wastage</th></tr>
          </thead>
          <tbody>${summaryRowsHtml || '<tr><td colspan="4">No items entered.</td></tr>'}</tbody>
        </table>

        ${confirmCoverageRows.length > 0 ? `
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
        ` : ''}

        ${confirmCoverageRows.length > 0 && hasWomenCoverageSummary ? `
          <h2>Coverage Summary (Women vaccination)</h2>
          <table>
            <thead>
              <tr><th>Vaccine</th><th>Pregnant</th><th>Non pregnant</th><th>Total</th></tr>
            </thead>
            <tbody>${womenRowsHtml}</tbody>
          </table>
        ` : ''}
      </div>
    `;
  }, [
    confirmSummaryRows,
    confirmCoverageRows,
    hasWomenCoverageSummary,
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
            width: {
              xs: 'calc(100vw - 12px)',
              sm: 'calc(100vw - 24px)',
              md: 'calc(100vw - 36px)',
              lg: 'calc(100vw - 56px)',
            },
            maxWidth: 'none',
            maxHeight: 'none',
            overflowY: 'visible',
            overflowX: 'hidden',
            paddingBottom: 0,
          }}
        >
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <ButtonWithIcon
              Icon={<PrinterIcon />}
              label={t('button.print')}
              onClick={onPrintSummary}
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
                overflowX: 'hidden',
              }}
            >
              <Box sx={{ minWidth: { xs: 560, sm: 760, md: 980, lg: 1240 } }}>
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
                      overflowX: 'hidden',
                    }}
                  >
                    <Box sx={{ minWidth: { xs: 640, sm: 760, md: 1180, lg: 1460 } }}>
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
                      {confirmCoverageRows.map((coverageRow, index) => {
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
                                index === confirmCoverageRows.length - 1
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

                  {hasWomenCoverageSummary ? (
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
                          overflowX: 'hidden',
                        }}
                      >
                        <Box sx={{ minWidth: { xs: 520, sm: 680, md: 900, lg: 1100 } }}>
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
                          {confirmCoverageRows.map((coverageRow, index) => {
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
                                    index === confirmCoverageRows.length - 1
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
                          {hasWomenCoverageSummary ? (
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
          justifyContent: 'space-between',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Typography fontWeight="bold">Daily Tally</Typography>
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
        <LoadingButton
          startIcon={<SaveIcon />}
          label={'Confirm'}
          color="secondary"
          variant="contained"
          onClick={() => onConfirm()}
          isLoading={isSaving}
        />
      </AppBarButtonsPortal>

      <Box paddingBottom={2}>
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          flexWrap="wrap"
          sx={{ paddingX: 2, paddingBottom: 1 }}
        >
          <Typography sx={{ minWidth: { xs: '100%', sm: 100 } }}>
            {t('label.patient')}
          </Typography>
          <Select
            value={selectedPatientId}
            onChange={event => setSelectedPatientId(String(event.target.value || ''))}
            options={patientOptions}
            fullWidth
            disabled={isPatientsLoading}
            sx={{ maxWidth: { xs: '100%', md: 420 } }}
          />
        </Box>

        <Box sx={{ paddingX: 2, paddingBottom: 1 }}>
          <Typography variant="subtitle2" sx={{ marginBottom: 0.5 }}>
            Daily Tally Items
          </Typography>

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
                  : 'No stock items with stock on hand are available for Daily Tally.'
              }
            />
          ) : (
            <>
              {vaccineRows.length > 0 ? (
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ marginY: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Vaccine items
                  </Typography>
                  <ButtonWithIcon
                    Icon={
                      <ChevronDownIcon
                        sx={{
                          transform: isVaccineBucketOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    }
                    label={isVaccineBucketOpen ? 'Collapse' : 'Expand'}
                    onClick={() => setIsVaccineBucketOpen(previous => !previous)}
                  />
                </Box>
              ) : null}

              {isVaccineBucketOpen
                ? vaccineRows.map(row => {
                    const coverage = coverageByItem[row.itemId] ?? defaultVaccineCoverageDraft();
                    const batchOptions = row.stockLines.map(stockLine => ({
                      value: stockLine.id,
                      label: batchLabel(stockLine),
                    }));
                    const batchUsedTotal = sumBatchDraft(row.batchDraftById, 'used');

                    return (
                      <Box
                        key={row.itemId}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          paddingX: 2,
                          paddingY: 1.5,
                          marginBottom: 1.25,
                        }}
                      >
                        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                          <Typography variant="body1" sx={itemTitleSx}>
                            {row.item}
                          </Typography>
                          {!isSimplifiedMode ? (
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
                        </Box>

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
                            Units
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Used
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Open vial wastage
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Waste
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Left
                          </Typography>

                          <Typography variant="body2">{row.soh}</Typography>
                          <Typography variant="body2">{row.units}</Typography>
                          {isSimplifiedMode ? (
                            <BasicTextInput
                              type="number"
                              size="small"
                              value={String(row.used)}
                              onChange={event => updateUsed(row, event.target.value)}
                            />
                          ) : (
                            <Typography variant="body2">{row.used}</Typography>
                          )}
                          {row.stockLines.length > 1 ? (
                            <Typography variant="caption" color="text.secondary">
                              Per-batch
                            </Typography>
                          ) : (
                            <Box display="flex" justifyContent="center" alignItems="center">
                              <Switch
                                checked={row.openVialWastage}
                                onChange={(_, checked) => updateOpenVialWastage(row, checked)}
                              />
                            </Box>
                          )}
                          <BasicTextInput
                            type="number"
                            size="small"
                            value={String(row.wastage)}
                            onChange={event =>
                              updateDraft(row.itemId, {
                                wastage: parseInput(event.target.value),
                              })
                            }
                          />
                          <Typography variant="body2">{row.remainingStock}</Typography>
                        </Box>

                        {!isSimplifiedMode && coverage.isOpen ? (
                          <Box sx={{ marginTop: 1 }}>
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
                                      type="number"
                                      size="small"
                                      value={String(ageGroup.male)}
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
                                      type="number"
                                      size="small"
                                      value={String(ageGroup.female)}
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

                            <Box
                              sx={{
                                marginTop: 1.25,
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
                                  const nonPregnantGroup =
                                    coverage.womenAgeGroups.find(isNonPregnantWomenGroup) ||
                                    coverage.womenAgeGroups[0];
                                  const pregnantGroup =
                                    coverage.womenAgeGroups.find(isPregnantWomenGroup) ||
                                    coverage.womenAgeGroups[1];

                                  const nonPregnant = nonPregnantGroup?.count ?? 0;
                                  const pregnant = pregnantGroup?.count ?? 0;

                                  return (
                                    <>
                                      <Typography variant="body2">Women 15 to 49 years</Typography>
                                      <BasicTextInput
                                        type="number"
                                        size="small"
                                        value={String(nonPregnant)}
                                        onChange={event =>
                                          updateCoverageForRow(row, current => ({
                                            ...current,
                                            womenAgeGroups: current.womenAgeGroups.map(group =>
                                              group.id === nonPregnantGroup?.id
                                                ? {
                                                    ...group,
                                                    count: parseWholeNumber(event.target.value),
                                                  }
                                                : group
                                            ),
                                          }))
                                        }
                                      />
                                      <BasicTextInput
                                        type="number"
                                        size="small"
                                        value={String(pregnant)}
                                        onChange={event =>
                                          updateCoverageForRow(row, current => ({
                                            ...current,
                                            womenAgeGroups: current.womenAgeGroups.map(group =>
                                              group.id === pregnantGroup?.id
                                                ? {
                                                    ...group,
                                                    count: parseWholeNumber(event.target.value),
                                                  }
                                                : group
                                            ),
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
                          </Box>
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
                                {isSimplifiedMode
                                  ? 'Enter used to allocate batches'
                                  : 'Enter coverage to allocate batches'}
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
                                  gridTemplateColumns="minmax(220px,2fr) repeat(3,minmax(0,1fr))"
                                  columnGap={1.25}
                                  rowGap={0.75}
                                  alignItems="center"
                                  marginTop={0.75}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Batch
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Used
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Open vial wastage
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Waste
                                  </Typography>

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
                                        <BasicTextInput
                                          type="number"
                                          size="small"
                                          value={String(batchDraft.used)}
                                          onChange={event =>
                                            updateBatchUsed(row, stockLine, event.target.value)
                                          }
                                        />
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
                                        <BasicTextInput
                                          type="number"
                                          size="small"
                                          value={String(batchDraft.wastage)}
                                          onChange={event =>
                                            updateBatchWastage(
                                              row,
                                              stockLine,
                                              event.target.value
                                            )
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
                                  Batch used total: {batchUsedTotal} / Item used: {row.used}
                                </Typography>
                                {Math.abs(batchUsedTotal - row.used) > 0.0001 ? (
                                  <Typography
                                    variant="caption"
                                    color="error.main"
                                    sx={{ display: 'block' }}
                                  >
                                    Batch used total must exactly match item used.
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
                                    One or more batch Used values exceed that batch stock.
                                  </Typography>
                                ) : null}
                              </>
                            ) : null}
                          </Box>
                        ) : row.stockLines[0] ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', marginTop: 0.75 }}
                          >
                            Batch: {batchLabel(row.stockLines[0])}
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  })
                : null}

              {nonVaccineRows.length > 0 ? (
                <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ marginY: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Non-vaccine items
                  </Typography>
                  <ButtonWithIcon
                    Icon={
                      <ChevronDownIcon
                        sx={{
                          transform: isNonVaccineBucketOpen
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    }
                    label={isNonVaccineBucketOpen ? 'Collapse' : 'Expand'}
                    onClick={() => setIsNonVaccineBucketOpen(previous => !previous)}
                  />
                </Box>
              ) : null}

              {isNonVaccineBucketOpen
                ? nonVaccineRows.map(row => {
                    const batchOptions = row.stockLines.map(stockLine => ({
                      value: stockLine.id,
                      label: batchLabel(stockLine),
                    }));
                    const batchUsedTotal = sumBatchDraft(row.batchDraftById, 'used');

                    return (
                      <Box
                        key={row.itemId}
                        sx={{
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: 1,
                          paddingX: 2,
                          paddingY: 1.5,
                          marginBottom: 1.25,
                        }}
                      >
                        <Typography variant="body1" sx={itemTitleSx}>
                          {row.item}
                        </Typography>
                        <Box
                          display="grid"
                          gridTemplateColumns="repeat(5,minmax(0,1fr))"
                          columnGap={1.25}
                          rowGap={0.75}
                          alignItems="center"
                          marginTop={0.75}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            SOH
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Units
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Used
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Waste
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            Left
                          </Typography>

                          <Typography variant="body2">{row.soh}</Typography>
                          <Typography variant="body2">{row.units}</Typography>
                          <BasicTextInput
                            type="number"
                            size="small"
                            value={String(row.used)}
                            onChange={event => updateUsed(row, event.target.value)}
                          />
                          <BasicTextInput
                            type="number"
                            size="small"
                            value={String(row.wastage)}
                            onChange={event =>
                              updateDraft(row.itemId, {
                                wastage: parseInput(event.target.value),
                              })
                            }
                          />
                          <Typography variant="body2">{row.remainingStock}</Typography>
                        </Box>

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
                                Enter used to allocate batches
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
                                    Used
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    Waste
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
                                          type="number"
                                          size="small"
                                          value={String(batchDraft.used)}
                                          onChange={event =>
                                            updateBatchUsed(row, stockLine, event.target.value)
                                          }
                                        />
                                        <BasicTextInput
                                          type="number"
                                          size="small"
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
                                  Batch used total: {batchUsedTotal} / Item used: {row.used}
                                </Typography>
                                {Math.abs(batchUsedTotal - row.used) > 0.0001 ? (
                                  <Typography
                                    variant="caption"
                                    color="error.main"
                                    sx={{ display: 'block' }}
                                  >
                                    Batch used total must exactly match item used.
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
                                    One or more batch Used values exceed that batch stock.
                                  </Typography>
                                ) : null}
                              </>
                            ) : null}
                          </Box>
                        ) : row.stockLines[0] ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', marginTop: 0.75 }}
                          >
                            Batch: {batchLabel(row.stockLines[0])}
                          </Typography>
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
