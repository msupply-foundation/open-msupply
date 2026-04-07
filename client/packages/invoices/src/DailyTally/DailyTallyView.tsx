import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBarButtonsPortal,
  AppBarContentPortal,
  BasicTextInput,
  Box,
  ButtonWithIcon,
  ChevronDownIcon,
  DateUtils,
  DialogButton,
  FnUtils,
  LoadingButton,
  NothingHere,
  RouteBuilder,
  SaveIcon,
  Select,
  Stack,
  Switch,
  Typography,
  UpdatePrescriptionStatusInput,
  UpdateStocktakeStatusInput,
  useDialog,
  useNavigate,
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
} from '@openmsupply-client/system';
import { usePrescription, usePrescriptionList } from '../Prescriptions/api';
import { usePrescriptionGraphQL } from '../Prescriptions/api/usePrescriptionGraphQL';
import { useStocktakeGraphQL } from '@openmsupply-client/inventory/src/Stocktake/api/useStocktakeGraphQL';
import {
  DemographicNodeLite,
  resolveDemographicBuckets,
} from './demographicBuckets';

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

const batchLabel = (stockLine: TallyStockLine) =>
  stockLine.batch || stockLine.expiryDate || stockLine.id.slice(0, 8);

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
  const isSimplifiedTabletUI = useSimplifiedTabletUI();
  const { useSimplifiedMobileUi = false } = usePreferences();
  const isSimplifiedMode = isSimplifiedTabletUI || useSimplifiedMobileUi;
  const navigate = useNavigate();
  const { error, success } = useNotification();
  const {
    create: { create: createPrescription },
  } = usePrescription();
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();
  const { stocktakeApi } = useStocktakeGraphQL();
  const itemApi = useItemApi();
  const { data: demographicData } = useDemographicData.demographics.list();

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
      .map(item => ({
        itemId: item.id,
        name: item.name,
        unitName: item.unitName || 'Units',
        isVaccine: item.isVaccine,
        doses: item.doses,
        sohPacks: round(item.availableStockOnHand),
        stockLines: item.availableBatches.nodes.map(stockLine => ({
          id: stockLine.id,
          batch: stockLine.batch,
          expiryDate: stockLine.expiryDate,
          availableNumberOfPacks: round(stockLine.availableNumberOfPacks),
          packSize: stockLine.packSize,
        })),
      }))
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
      const effectiveWastage = isMultiBatch
        ? sumBatchDraft(draft.batchDraftById, 'wastage')
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
    const used = parseInput(rawValue);
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
        });

        const createdPrescriptionId = prescription?.id;
        if (!createdPrescriptionId) {
          throw new Error('Could not create daily tally prescription');
        }

        const lines = usedRows.flatMap(row => {
          const lineNote = dailyTallyLineNote(row, coverageByItem[row.itemId]);

          if (row.stockLines.length > 1) {
            const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};

            return row.stockLines.flatMap(stockLine => {
              const batchUsed = batchDraftById[stockLine.id]?.used ?? 0;
              if (batchUsed <= 0) return [];

              const packs = toPacks(batchUsed, row.isVaccine, row.doses);
              if (packs - stockLine.availableNumberOfPacks > 0.0001) {
                throw new Error(`Insufficient stock for ${row.item}`);
              }

              return {
                id: FnUtils.generateUUID(),
                invoiceId: createdPrescriptionId,
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

          return allocations.map(({ stockLine, packs }) => ({
            id: FnUtils.generateUUID(),
            invoiceId: createdPrescriptionId,
            stockLineId: stockLine.id,
            numberOfPacks: packs,
            note: lineNote,
          }));
        });

        if (lines.length === 0) {
          throw new Error('Could not create daily tally prescription lines');
        }

        await prescriptionApi.upsertPrescription({
          storeId,
          input: {
            insertPrescriptionLines: lines,
            updatePrescriptions: [
              {
                id: createdPrescriptionId,
                status: UpdatePrescriptionStatusInput.Verified,
              },
            ],
          },
        });

      }

      if (wastageRows.length > 0) {
        const stocktakeId = FnUtils.generateUUID();
        const inserted = await stocktakeApi.insertStocktake({
          storeId,
          input: {
            id: stocktakeId,
            createBlankStocktake: true,
            description: 'Daily tally wastage',
            comment: tallyReference,
          },
        });

        if (inserted.insertStocktake.__typename !== 'StocktakeNode') {
          throw new Error('Could not create daily tally stocktake');
        }

        const insertStocktakeLines = wastageRows.flatMap(row => {
          if (row.stockLines.length > 1) {
            const batchDraftById = draftByItem[row.itemId]?.batchDraftById ?? {};

            return row.stockLines.flatMap(stockLine => {
              const isOpen = batchDraftById[stockLine.id]?.openVialWastage ?? false;
              const batchWastage = batchDraftById[stockLine.id]?.wastage ?? 0;
              if (batchWastage <= 0) return [];

              const packs = toPacks(batchWastage, row.isVaccine, row.doses);
              if (packs - stockLine.availableNumberOfPacks > 0.0001) {
                throw new Error(`Insufficient stock for ${row.item}`);
              }

              return {
                id: FnUtils.generateUUID(),
                stocktakeId,
                stockLineId: stockLine.id,
                countedNumberOfPacks: round(stockLine.availableNumberOfPacks - packs),
                packSize: stockLine.packSize,
                comment: isOpen ? 'Open vial wastage' : 'Wastage',
              };
            });
          }

          const requiredPacks = toPacks(row.wastage, row.isVaccine, row.doses);
          const { allocations, remaining } = allocateAcrossStockLines(
            row.stockLines,
            requiredPacks
          );

          if (remaining > 0.0001) {
            throw new Error(`Insufficient stock for ${row.item}`);
          }

          return allocations.map(({ stockLine, packs }) => ({
            id: FnUtils.generateUUID(),
            stocktakeId,
            stockLineId: stockLine.id,
            countedNumberOfPacks: round(stockLine.availableNumberOfPacks - packs),
            packSize: stockLine.packSize,
            comment: row.openVialWastage ? 'Open vial wastage' : 'Wastage',
          }));
        });

        if (insertStocktakeLines.length > 0) {
          await stocktakeApi.upsertStocktakeLines({
            storeId,
            insertStocktakeLines,
          });
        }

        await stocktakeApi.updateStocktake({
          storeId,
          input: {
            id: stocktakeId,
            status: UpdateStocktakeStatusInput.Finalised,
          },
        });
      }

      success('Daily tally confirmed')();
      setConfirmSummaryOpen(false);
      setDuplicateWarningOpen(false);
      navigate(dailyTallyListPath, { replace: true });
    } catch (e) {
      error((e as Error).message || 'Unexpected error')();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ConfirmSummaryModal
        title={'Confirm daily tally'}
        okButton={
          <LoadingButton
            label={'Confirm'}
            color="secondary"
            variant="contained"
            isLoading={isSaving}
            onClick={async () => {
              setConfirmSummaryOpen(false);
              await onConfirm(true);
            }}
          />
        }
        cancelButton={
          <DialogButton variant="cancel" onClick={() => setConfirmSummaryOpen(false)} />
        }
      >
        <Stack spacing={1} sx={{ minWidth: 760, maxHeight: 420, overflowY: 'auto' }}>

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
          {confirmSummaryRows.length > 0 ? (
            <Box
              display="grid"
              gridTemplateColumns="minmax(280px,2fr) minmax(140px,1fr) minmax(140px,1fr) minmax(140px,1fr)"
              columnGap={1}
              rowGap={0.75}
              alignItems="center"
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
              {confirmSummaryRows.map((summaryRow, index) => (
                <React.Fragment
                  key={`${summaryRow.item}-${summaryRow.batch}-${summaryRow.issued}-${index}`}
                >
                  <Typography variant="body2">{summaryRow.item}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summaryRow.batch}
                  </Typography>
                  <Typography variant="body2">{summaryRow.issued}</Typography>
                  <Typography variant="body2">{summaryRow.wastage}</Typography>
                </React.Fragment>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No summary lines available.
            </Typography>
          )}
          {!isSimplifiedMode &&
          coverageSummaryText(rows.filter(row => row.isVaccine && row.used > 0), coverageByItem) ? (
            <Box marginTop={1}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Coverage
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {coverageSummaryText(
                  rows.filter(row => row.isVaccine && row.used > 0),
                  coverageByItem
                )}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </ConfirmSummaryModal>

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
        <Box display="flex" gap={2} alignItems="center">
          <Typography fontWeight="bold">Daily Tally</Typography>
          <BasicTextInput
            size="small"
            placeholder="Daily tally reference"
            value={referenceText}
            onChange={event => setReferenceText(event.target.value)}
            sx={{ width: 280 }}
          />
          <BasicTextInput
            size="small"
            placeholder={t('placeholder.filter-items')}
            value={filterText}
            onChange={event => setFilterText(event.target.value)}
            sx={{ width: 260 }}
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
          sx={{ paddingX: 2, paddingBottom: 1 }}
        >
          <Typography sx={{ minWidth: 100 }}>{t('label.patient')}</Typography>
          <Select
            value={selectedPatientId}
            onChange={event => setSelectedPatientId(String(event.target.value || ''))}
            options={patientOptions}
            fullWidth
            disabled={isPatientsLoading}
            sx={{ maxWidth: 420 }}
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
                          gridTemplateColumns="110px 120px 110px 140px 110px 110px"
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
                            Open vial
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
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              Child coverage
                            </Typography>
                            <Box
                              display="grid"
                              gridTemplateColumns="minmax(300px,1fr) 110px 110px 90px 64px"
                              columnGap={1.25}
                              rowGap={0.75}
                              alignItems="center"
                              marginTop={0.5}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Age group
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
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Del
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
                                  <Typography variant="caption" color="text.disabled">
                                    -
                                  </Typography>
                                </React.Fragment>
                              ))}
                            </Box>

                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, display: 'block', marginTop: 1.25 }}
                            >
                              Women coverage
                            </Typography>
                            <Box
                              display="grid"
                              gridTemplateColumns="minmax(300px,1fr) 130px 130px 90px 64px"
                              columnGap={1.25}
                              rowGap={0.75}
                              alignItems="center"
                              marginTop={0.5}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Age group
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
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Del
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
                                    <Typography variant="caption" color="text.disabled">
                                      -
                                    </Typography>
                                  </>
                                );
                              })()}
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
                                  gridTemplateColumns="minmax(280px,1fr) 130px 130px 110px"
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
                                    Open vial
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
                          gridTemplateColumns="110px 120px 140px 140px 110px"
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
                                  gridTemplateColumns="minmax(280px,1fr) 130px 110px"
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
