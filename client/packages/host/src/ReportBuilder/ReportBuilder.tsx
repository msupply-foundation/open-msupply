import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Tab,
  TabContext,
  TabList,
  Typography,
  useAuthContext,
  useIsCentralServerApi,
  useNotification,
  useQuery,
  useQueryClient,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useHostApi } from '../api/hooks/utils/useHostApi';
import { LoadingButton } from '@common/components';
import { SaveIcon } from '@common/icons';
import { ReportList } from './ReportList';
import { NewReportModal } from './NewReportModal';
import { DetectedContext, detectContext } from './detectContext';

// ─── Types ────────────────────────────────────────────────────────────────────

enum EditorTab {
  Query = 'query.graphql',
  Style = 'style.css',
  Template = 'template.html',
  Header = 'header.html',
}

enum ReportEntryType {
  TeraTemplate = 'TeraTemplate',
  Resource = 'Resource',
  GraphQlQuery = 'GraphQLQuery',
}

type ReportDefinition = {
  index: {
    template: string;
    header?: string | null;
    query: string[];
  };
  entries: Record<string, { type: ReportEntryType; data: unknown }>;
};

type RecordOption = {
  label: string;
  value: string;
};

type SavedReportOption = {
  label: string;
  value: string;
  template: string;
  context: string;
  subContext: string | null;
  isCustom: boolean;
};

// ─── Context detection ────────────────────────────────────────────────────────

const contextLabel: Record<NonNullable<DetectedContext>, string> = {
  REQUISITION: 'Requisition',
  INBOUND_SHIPMENT: 'Inbound Shipment',
  OUTBOUND_SHIPMENT: 'Outbound Shipment',
  PRESCRIPTION: 'Prescription',
  STOCKTAKE: 'Stocktake',
  PURCHASE_ORDER: 'Purchase Order',
  CUSTOMER_RETURN: 'Customer Return',
  SUPPLIER_RETURN: 'Supplier Return',
  INTERNAL_ORDER: 'Internal Order',
};

/** Maps DetectedContext values to the GraphQL ReportContext enum values */
const contextToReportContext: Record<NonNullable<DetectedContext>, string> = {
  REQUISITION: 'REQUISITION',
  INBOUND_SHIPMENT: 'INBOUND_SHIPMENT',
  OUTBOUND_SHIPMENT: 'OUTBOUND_SHIPMENT',
  PRESCRIPTION: 'PRESCRIPTION',
  STOCKTAKE: 'STOCKTAKE',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  CUSTOMER_RETURN: 'CUSTOMER_RETURN',
  SUPPLIER_RETURN: 'SUPPLIER_RETURN',
  INTERNAL_ORDER: 'INTERNAL_ORDER',
};

// ─── Build report definition ──────────────────────────────────────────────────

const buildReport = (
  template: string,
  header: string,
  style: string,
  query: string
): ReportDefinition => {
  const entries: ReportDefinition['entries'] = {};
  const queryList: string[] = [];

  if (template) {
    entries['template.html'] = {
      type: ReportEntryType.TeraTemplate,
      data: { output: 'Html', template },
    };
  }
  if (header) {
    entries['header.html'] = {
      type: ReportEntryType.TeraTemplate,
      data: { output: 'Html', template: header },
    };
  }
  if (style) {
    entries['style.css'] = {
      type: ReportEntryType.Resource,
      data: style,
    };
  }
  if (query) {
    entries['query'] = {
      type: ReportEntryType.GraphQlQuery,
      data: { query },
    };
    queryList.push('query');
  }

  return {
    index: {
      template: 'template.html',
      header: header ? 'header.html' : null,
      query: queryList,
    },
    entries,
  };
};

// ─── Parse a saved report definition back into editor fields ─────────────────

const parseReportDefinition = (
  templateJson: string
): { query: string; style: string; template: string; header: string } => {
  const result = { query: '', style: '', template: '', header: '' };
  try {
    const def = JSON.parse(templateJson) as ReportDefinition;
    if (!def.entries) return result;

    // Use the index to look up template and header entries
    if (def.index.template) {
      const tpl = def.entries[def.index.template];
      if (tpl?.type === ReportEntryType.TeraTemplate) {
        result.template = (tpl.data as any)?.template ?? '';
      }
    }
    if (def.index.header) {
      const hdr = def.entries[def.index.header];
      if (hdr?.type === ReportEntryType.TeraTemplate) {
        result.header = (hdr.data as any)?.template ?? '';
      }
    }

    // Find the style entry (Resource type with .css key)
    for (const [key, entry] of Object.entries(def.entries)) {
      if (entry.type === ReportEntryType.Resource && key.endsWith('.css')) {
        result.style = typeof entry.data === 'string' ? entry.data : '';
      }
    }

    // Find the query entry
    for (const queryKey of def.index.query ?? []) {
      const qEntry = def.entries[queryKey];
      if (qEntry?.type === ReportEntryType.GraphQlQuery) {
        result.query = (qEntry.data as any)?.query ?? '';
      }
    }
  } catch {
    // If parsing fails, return empty defaults
  }
  return result;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Sort descending, keep most recent 100, then re-sort ascending for display */
const sortAndSlice = <T,>(items: T[], getNumber: (item: T) => number): T[] =>
  [...items]
    .sort((a, b) => getNumber(b) - getNumber(a))
    .slice(0, 100)
    .sort((a, b) => getNumber(a) - getNumber(b));

// ─── Record picker hook ───────────────────────────────────────────────────────

const useRecordOptions = (
  context: DetectedContext,
  storeId: string
): { options: RecordOption[]; isLoading: boolean } => {
  const api = useHostApi();

  const invoiceType =
    context === 'INBOUND_SHIPMENT'
      ? 'INBOUND_SHIPMENT'
      : context === 'OUTBOUND_SHIPMENT'
      ? 'OUTBOUND_SHIPMENT'
      : context === 'PRESCRIPTION'
      ? 'PRESCRIPTION'
      : context === 'CUSTOMER_RETURN'
      ? 'CUSTOMER_RETURN'
      : context === 'SUPPLIER_RETURN'
      ? 'SUPPLIER_RETURN'
      : null;

  const isInvoiceContext = invoiceType !== null;
  const isRequisition = context === 'REQUISITION' || context === 'INTERNAL_ORDER';
  const isStocktake = context === 'STOCKTAKE';
  const isPurchaseOrder = context === 'PURCHASE_ORDER';

  const { data: invoices, isLoading: loadingInvoices } = useQuery(
    ['reportBuilder', 'invoices', storeId, invoiceType],
    () => api.get.reportBuilderInvoices(storeId, invoiceType!),
    { enabled: isInvoiceContext }
  );

  const { data: requisitions, isLoading: loadingRequisitions } = useQuery(
    ['reportBuilder', 'requisitions', storeId],
    () => api.get.reportBuilderRequisitions(storeId),
    { enabled: isRequisition }
  );

  const { data: stocktakes, isLoading: loadingStocktakes } = useQuery(
    ['reportBuilder', 'stocktakes', storeId],
    () => api.get.reportBuilderStocktakes(storeId),
    { enabled: isStocktake }
  );

  const { data: purchaseOrders, isLoading: loadingPurchaseOrders } = useQuery(
    ['reportBuilder', 'purchaseOrders', storeId],
    () => api.get.reportBuilderPurchaseOrders(storeId),
    { enabled: isPurchaseOrder }
  );

  const options = useMemo<RecordOption[]>(() => {
    if (isInvoiceContext && invoices) {
      return sortAndSlice(invoices, r => r.invoiceNumber).map(r => ({
        label: `#${r.invoiceNumber} — ${r.otherPartyName}`,
        value: r.id,
      }));
    }
    if (isRequisition && requisitions) {
      return sortAndSlice(requisitions, r => r.requisitionNumber).map(r => ({
        label: `#${r.requisitionNumber} — ${r.otherPartyName}`,
        value: r.id,
      }));
    }
    if (isStocktake && stocktakes) {
      return sortAndSlice(stocktakes, r => r.stocktakeNumber).map(r => ({
        label: `#${r.stocktakeNumber}${r.description ? ` — ${r.description}` : ''}`,
        value: r.id,
      }));
    }
    if (isPurchaseOrder && purchaseOrders) {
      return sortAndSlice(purchaseOrders, r => r.number).map(r => ({
        label: `#${r.number} — ${r.supplier?.name ?? 'Unknown supplier'}`,
        value: r.id,
      }));
    }
    return [];
  }, [isInvoiceContext, invoices, isRequisition, requisitions, isStocktake, stocktakes, isPurchaseOrder, purchaseOrders]);

  const isLoading =
    loadingInvoices ||
    loadingRequisitions ||
    loadingStocktakes ||
    loadingPurchaseOrders;

  return { options, isLoading };
};

// ─── Record picker ────────────────────────────────────────────────────────────

const RecordPicker = ({
  detectedContext,
  options,
  loadingRecords,
  selectedRecord,
  setSelectedRecord,
  error,
}: {
  detectedContext: DetectedContext;
  options: RecordOption[];
  loadingRecords: boolean;
  selectedRecord: RecordOption | null;
  setSelectedRecord: (r: RecordOption | null) => void;
  error: string;
}) => (
  <Box
    padding={2}
    borderBottom="1px solid"
    sx={{ borderColor: 'divider', overflow: 'hidden' }}
  >
    <Typography variant="h6" marginBottom={1}>
      {detectedContext
        ? `Preview using ${contextLabel[detectedContext]}`
        : 'Preview'}
    </Typography>

    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {detectedContext ? (
        <Autocomplete
          loading={loadingRecords}
          options={options}
          value={selectedRecord}
          isOptionEqualToValue={(option, value) =>
            option.value === value.value
          }
          onChange={(_e, selected) =>
            setSelectedRecord(selected as RecordOption | null)
          }
          noOptionsText={`No ${contextLabel[detectedContext]} records found in this store`}
          width="100%"
          sx={{ width: '100%' }}
        />
      ) : (
        <Typography variant="body2" color="textSecondary">
          This report doesn't have a specific record type
        </Typography>
      )}
    </div>

    <Typography
      color="error"
      variant="body2"
      marginTop={1}
      sx={{ visibility: error ? 'visible' : 'hidden', minHeight: '1.5em' }}
    >
      {error || ' '}
    </Typography>
  </Box>
);

// ─── Editor tabs config ───────────────────────────────────────────────────────

const tabs = [
  { value: EditorTab.Query, label: 'query.graphql' },
  { value: EditorTab.Style, label: 'style.css' },
  { value: EditorTab.Template, label: 'template.html' },
  { value: EditorTab.Header, label: 'header.html' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export const ReportBuilder: React.FC = () => {
  const { storeId } = useAuthContext();
  const isCentralServer = useIsCentralServerApi();
  const api = useHostApi();
  const queryClient = useQueryClient();
  const { success, error: notifyError } = useNotification();

  const [currentTab, setCurrentTab] = useState<EditorTab>(EditorTab.Query);
  const [template, setTemplate] = useState('');
  const [header, setHeader] = useState('');
  const [style, setStyle] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<RecordOption | null>(null);
  const [reportUrl, setReportUrl] = useState('');
  const [error, setError] = useState('');

  // ── Save state ──
  const [reportName, setReportName] = useState('');
  const [loadedReportId, setLoadedReportId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Load state ──
  const [selectedSavedReport, setSelectedSavedReport] =
    useState<SavedReportOption | null>(null);

  // ── New report modal ──
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [manualContext, setManualContext] = useState<DetectedContext>(null);

  const handleNewReport = useCallback((context: DetectedContext) => {
    setSelectedSavedReport(null);
    setLoadedReportId(null);
    setReportName('');
    setQuery('');
    setStyle('');
    setTemplate('');
    setHeader('');
    setReportUrl('');
    setError('');
    setManualContext(context);
  }, []);

  const detectedContext = useMemo(() => detectContext(query), [query]);
  const effectiveContext = detectedContext ?? manualContext;
  const { options, isLoading: loadingRecords } = useRecordOptions(effectiveContext, storeId);
  // Note: we call api.generateOneOffReport directly (not via useMutation) so that
  // preview render errors are handled locally and don't trigger the global mutation
  // onError notification handler in QueryErrorHandler.

  // ── Fetch saved reports ──
  const { data: savedReports = [], isLoading: loadingSavedReports } = useQuery(
    ['reportBuilder', 'savedReports', storeId],
    async () => {
      const nodes = await api.get.reportBuilderList(storeId, 'en');
      return nodes.map(
        (r): SavedReportOption => ({
          label: r.name || r.code || r.id,
          value: r.id,
          template: r.template,
          context: r.context,
          subContext: r.subContext ?? null,
          isCustom: r.isCustom,
        })
      );
    }
  );

  useEffect(() => {
    if (!selectedRecord && options.length > 0) setSelectedRecord(options[0] ?? null);
    else if (!options.length) setSelectedRecord(null);
  }, [options, selectedRecord]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!template) return;
      if (effectiveContext && !selectedRecord) return;
      // Skip if a record is selected but no options exist for this context —
      // the record is stale from a previous context
      if (selectedRecord && options.length === 0) return;
      const report = buildReport(template, header, style, query);
      api.generateOneOffReport({ report, dataId: selectedRecord?.value ?? '', storeId, arguments: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } })
        .then(result => {
          if (!result) return;
          if (result.__typename === 'PrintReportError') {
            setReportUrl('');
            setError(result.error.description);
            return;
          }
          setError('');
          setReportUrl(`${Environment.FILE_URL}${result.fileId}`);
        })
        .catch(e => {
          setReportUrl('');
          setError(String(e));
        });
    }, 500);
    return () => clearTimeout(handler);
  }, [template, header, style, query, selectedRecord, effectiveContext, options, storeId]);

  // ── Load a saved report into the editors ──
  const handleLoadReport = useCallback(
    (report: SavedReportOption | null) => {
      setSelectedSavedReport(report);
      setSelectedRecord(null); // clear stale record so no render fires with wrong data
      if (!report) {
        setLoadedReportId(null);
        return;
      }

      const parsed = parseReportDefinition(report.template);
      setQuery(parsed.query);
      setStyle(parsed.style);
      setTemplate(parsed.template);
      setHeader(parsed.header);
      setReportName(report.label);
      setLoadedReportId(report.value);
      setManualContext((report.context as DetectedContext) ?? null);
    },
    []
  );

  // ── Save the current report ──
  // Central server: can update any report (built-in or custom)
  // Remote server: can only update custom reports; built-in reports must be duplicated (new id)
  const canUpdate = isCentralServer || (selectedSavedReport?.isCustom ?? false);

  const handleSave = useCallback(async () => {
    if (!reportName.trim()) {
      notifyError('Please enter a report name')();
      return;
    }
    if (!template.trim()) {
      notifyError('Template cannot be empty')();
      return;
    }

    setIsSaving(true);
    try {
      const reportDefinition = buildReport(template, header, style, query);
      // Use detected context first, then the effective context (manual/loaded), then 'REPORT' as safe default.
      // Previously defaulted to 'OUTBOUND_SHIPMENT' which caused wrong record pickers when re-loading saved reports.
      const ctx = detectedContext
        ? contextToReportContext[detectedContext]
        : (effectiveContext as string) ?? 'REPORT';

      // On remote server with a built-in report loaded, force id=undefined so a new custom report is created
      const effectiveId = canUpdate ? (loadedReportId ?? undefined) : undefined;

      const result = await api.upsertReportDefinition({
        storeId,
        input: {
          id: effectiveId,
          name: reportName.trim(),
          template: reportDefinition,
          context: ctx,
        },
      });

      if (result?.id) {
        setLoadedReportId(result.id);
        success('Report saved successfully')();
        // Refresh the saved reports list
        queryClient.invalidateQueries(['reportBuilder', 'savedReports']);
      }
    } catch (e) {
      notifyError(`Failed to save report: ${e instanceof Error ? e.message : String(e)}`)();
    } finally {
      setIsSaving(false);
    }
  }, [
    reportName,
    template,
    header,
    style,
    query,
    detectedContext,
    effectiveContext,
    canUpdate,
    loadedReportId,
    storeId,
    api,
    notifyError,
    success,
    queryClient,
  ]);


  // Map each tab to its value/setter
  const tabContent: Record<EditorTab, { value: string; onChange: (v: string) => void; placeholder: string }> = {
    [EditorTab.Query]: { value: query, onChange: setQuery, placeholder: 'Write your GraphQL query here...' },
    [EditorTab.Style]: { value: style, onChange: setStyle, placeholder: 'Write your CSS here...' },
    [EditorTab.Template]: { value: template, onChange: setTemplate, placeholder: 'Write your Tera HTML template here...' },
    [EditorTab.Header]: { value: header, onChange: setHeader, placeholder: 'Optional header template...' },
  };

  const active = tabContent[currentTab];
  const hasActiveReport = !!loadedReportId || !!manualContext;

  return (
    <Box display="flex" width="100%" height="100%" overflow="hidden">
      {/* ── Column 1: report list ── */}
      <ReportList
        reports={savedReports}
        isLoading={loadingSavedReports}
        selectedReportId={selectedSavedReport?.value ?? null}
        onSelectReport={handleLoadReport}
        onNewReport={() => setIsNewReportModalOpen(true)}
        isCentralServer={isCentralServer}
      />

      <NewReportModal
        open={isNewReportModalOpen}
        onClose={() => setIsNewReportModalOpen(false)}
        onSelect={handleNewReport}
      />

      {hasActiveReport && (
      <>
      {/* ── Column 2: editors ── */}
      <Box
        width="480px"
        minWidth="480px"
        display="flex"
        flexDirection="column"
        borderRight="1px solid"
        sx={{ borderColor: 'divider' }}
        overflow="hidden"
      >
        <Typography variant="h5" padding={2} paddingBottom={0}>
          Report Builder
        </Typography>

        {/* ── Save controls ── */}
        <Box
          paddingX={2}
          paddingTop={1}
          display="flex"
          gap={1}
          alignItems="center"
        >
          <input
            type="text"
            value={reportName}
            onChange={e => setReportName(e.target.value)}
            placeholder="Report name"
            style={{
              flex: 1,
              height: '36px',
              fontFamily: 'inherit',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: 'inherit',
              border: '1px solid rgba(128,128,128,0.3)',
              borderRadius: '4px',
              padding: '0 8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <LoadingButton
            isLoading={isSaving}
            label={selectedSavedReport ? (canUpdate ? 'Update' : 'Duplicate') : 'Save'}
            onClick={handleSave}
            startIcon={<SaveIcon />}
            variant="outlined"
            color="secondary"
            sx={{ height: '36px', minWidth: '100px' }}
          />
        </Box>

        <TabContext value={currentTab}>
          <TabList
            value={currentTab}
            onChange={(_, v) => setCurrentTab(v as EditorTab)}
            sx={{
              borderBottom: 'none',
              '& .MuiTabs-indicator': {
                backgroundColor: '#f97316',
                height: '3px',
              },
            }}
          >
            {tabs.map(tab => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </TabList>
        </TabContext>

        {/* Single textarea that swaps content based on active tab */}
        <Box flex={1} overflow="hidden" padding={1} sx={{ display: 'flex' }}>
          <textarea
            value={active.value}
            onChange={e => active.onChange(e.target.value)}
            placeholder={active.placeholder}
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              resize: 'none',
              fontFamily: 'monospace',
              fontSize: '13px',
              backgroundColor: 'transparent',
              color: 'inherit',
              border: '1px solid rgba(128,128,128,0.3)',
              borderRadius: '4px',
              padding: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </Box>
      </Box>

      {/* ── Right panel: record picker + preview ── */}
      <Box
        flex={1}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <RecordPicker
          detectedContext={effectiveContext}
          options={options}
          loadingRecords={loadingRecords}
          selectedRecord={selectedRecord}
          setSelectedRecord={setSelectedRecord}
          error={error}
        />

        <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {reportUrl && (
            <iframe
              src={reportUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          )}
        </Box>
      </Box>
      </>
      )}
    </Box>
  );
};
