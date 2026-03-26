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
import { useGenerateOneOffReport } from '../api/hooks/settings/useGenerateOneOffReport';
import { LoadingButton } from '@common/components';
import { CopyIcon, SaveIcon } from '@common/icons';

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
  GraphQlQuery = 'GraphGLQuery',
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
  isCustom: boolean;
};

// ─── Context detection ────────────────────────────────────────────────────────

type DetectedContext =
  | 'REQUISITION'
  | 'INBOUND_SHIPMENT'
  | 'OUTBOUND_SHIPMENT'
  | 'PRESCRIPTION'
  | 'STOCKTAKE'
  | 'PURCHASE_ORDER'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | null;

const detectContext = (query: string): DetectedContext => {
  if (!query) return null;
  const q = query.toLowerCase();
  if (q.includes('requisition(')) return 'REQUISITION';
  if (q.includes('stocktake(')) return 'STOCKTAKE';
  if (q.includes('purchaseorder(')) return 'PURCHASE_ORDER';
  if (q.includes('inbound_shipment') || q.includes('inboundshipment'))
    return 'INBOUND_SHIPMENT';
  if (q.includes('outbound_shipment') || q.includes('outboundshipment'))
    return 'OUTBOUND_SHIPMENT';
  if (q.includes('prescription')) return 'PRESCRIPTION';
  if (q.includes('customer_return') || q.includes('customerreturn'))
    return 'CUSTOMER_RETURN';
  if (q.includes('supplier_return') || q.includes('supplierreturn'))
    return 'SUPPLIER_RETURN';
  if (q.includes('invoice(')) return 'OUTBOUND_SHIPMENT';
  return null;
};

const contextLabel: Record<NonNullable<DetectedContext>, string> = {
  REQUISITION: 'Requisition',
  INBOUND_SHIPMENT: 'Inbound Shipment',
  OUTBOUND_SHIPMENT: 'Outbound Shipment',
  PRESCRIPTION: 'Prescription',
  STOCKTAKE: 'Stocktake',
  PURCHASE_ORDER: 'Purchase Order',
  CUSTOMER_RETURN: 'Customer Return',
  SUPPLIER_RETURN: 'Supplier Return',
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
    if (def.index.template && def.entries[def.index.template]) {
      const tpl = def.entries[def.index.template];
      if (tpl.type === ReportEntryType.TeraTemplate) {
        result.template = (tpl.data as any)?.template ?? '';
      }
    }
    if (def.index.header && def.entries[def.index.header]) {
      const hdr = def.entries[def.index.header];
      if (hdr.type === ReportEntryType.TeraTemplate) {
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
  const isRequisition = context === 'REQUISITION';
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
      return [...invoices]
        .sort((a, b) => a.invoiceNumber - b.invoiceNumber)
        .map(r => ({
          label: `#${r.invoiceNumber} — ${r.otherPartyName}`,
          value: r.id,
        }));
    }
    if (isRequisition && requisitions) {
      return [...requisitions]
        .sort((a, b) => a.requisitionNumber - b.requisitionNumber)
        .map(r => ({
          label: `#${r.requisitionNumber} — ${r.otherPartyName}`,
          value: r.id,
        }));
    }
    if (isStocktake && stocktakes) {
      return [...stocktakes]
        .sort((a, b) => a.stocktakeNumber - b.stocktakeNumber)
        .map(r => ({
          label: `#${r.stocktakeNumber}${r.description ? ` — ${r.description}` : ''}`,
          value: r.id,
        }));
    }
    if (isPurchaseOrder && purchaseOrders) {
      return [...purchaseOrders]
        .sort((a, b) => a.number - b.number)
        .map(r => ({
          label: `#${r.number} — ${r.supplier?.name ?? 'Unknown supplier'}`,
          value: r.id,
        }));
    }
    return [];
  }, [context, invoices, requisitions, stocktakes, purchaseOrders]);

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
  hasContent,
}: {
  detectedContext: DetectedContext;
  options: RecordOption[];
  loadingRecords: boolean;
  selectedRecord: RecordOption | null;
  setSelectedRecord: (r: RecordOption | null) => void;
  error: string;
  hasContent: boolean;
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
      ) : hasContent ? (
        <Typography variant="body2" color="textSecondary">
          This report doesn't have a specific record type
        </Typography>
      ) : (
        <Typography variant="body2" color="textSecondary">
          Fill the tabs at left to see a preview of the report.
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

  const detectedContext = useMemo(() => detectContext(query), [query]);
  const { options, isLoading: loadingRecords } = useRecordOptions(detectedContext, storeId);
  const { mutateAsync: renderReport } = useGenerateOneOffReport();

  // ── Fetch saved reports ──
  const { data: savedReports = [], isLoading: loadingSavedReports } = useQuery(
    ['reportBuilder', 'savedReports', storeId],
    async () => {
      const nodes = await api.get.reportBuilderList(storeId, 'en');
      return (nodes as any[]).map(
        (r: any): SavedReportOption => ({
          label: r.name || r.code || r.id,
          value: r.id,
          template: r.template,
          context: r.context,
          isCustom: r.isCustom,
        })
      );
    }
  );

  useEffect(() => {
    setSelectedRecord(null);
  }, [detectedContext]);

  useEffect(() => {
    if (options.length > 0 && !selectedRecord) {
      setSelectedRecord(options[0]);
    }
  }, [options]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!template) return;
      const report = buildReport(template, header, style, query);
      renderReport({ report, dataId: selectedRecord?.value ?? '', storeId, arguments: {} })
        .then(result => {
          if (!result) return;
          if (result.__typename === 'PrintReportError') {
            setError(result.error.description);
            return;
          }
          setReportUrl(`${Environment.FILE_URL}${result.fileId}`);
          setError('');
        })
        .catch(e => setError(`${e}`));
    }, 500);
    return () => clearTimeout(handler);
  }, [template, header, style, query, selectedRecord]);

  // ── Load a saved report into the editors ──
  const handleLoadReport = useCallback(
    (report: SavedReportOption | null) => {
      setSelectedSavedReport(report);
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
    },
    []
  );

  // ── Save the current report ──
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
      const ctx = detectedContext
        ? contextToReportContext[detectedContext]
        : 'OUTBOUND_SHIPMENT';

      const result = await api.upsertReportDefinition({
        storeId,
        input: {
          id: loadedReportId ?? undefined,
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
      notifyError(`Failed to save report: ${e}`)();
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
    loadedReportId,
    storeId,
  ]);

  // ── Edit / duplicate logic ──
  // On central server: always editable.
  // On remote server: editable only if isCustom=true; otherwise must duplicate.
  const loadedReportIsCustom = selectedSavedReport?.isCustom ?? true;
  const showDuplicate = !isCentralServer && !!loadedReportId && !loadedReportIsCustom;

  // ── Duplicate the current report ──
  const handleDuplicate = useCallback(async () => {
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
      const ctx = detectedContext
        ? contextToReportContext[detectedContext]
        : 'OUTBOUND_SHIPMENT';

      // Always save as new (no id) — backend will set isCustom=true
      const result = await api.upsertReportDefinition({
        storeId,
        input: {
          name: reportName.trim(),
          template: reportDefinition,
          context: ctx,
        },
      });

      if (result?.id) {
        setLoadedReportId(result.id);
        success('Report duplicated successfully')();
        queryClient.invalidateQueries(['reportBuilder', 'savedReports']);
      }
    } catch (e) {
      notifyError(`Failed to duplicate report: ${e}`)();
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
    storeId,
  ]);

  // Map each tab to its value/setter
  const tabContent: Record<EditorTab, { value: string; onChange: (v: string) => void; placeholder: string }> = {
    [EditorTab.Query]: { value: query, onChange: setQuery, placeholder: 'Write your GraphQL query here...' },
    [EditorTab.Style]: { value: style, onChange: setStyle, placeholder: 'Write your CSS here...' },
    [EditorTab.Template]: { value: template, onChange: setTemplate, placeholder: 'Write your Tera HTML template here...' },
    [EditorTab.Header]: { value: header, onChange: setHeader, placeholder: 'Optional header template...' },
  };

  const active = tabContent[currentTab];

  return (
    <Box display="flex" height="100vh" overflow="hidden">
      {/* ── Left panel: editors ── */}
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

        {/* ── Load saved report ── */}
        <Box paddingX={2} paddingTop={1.5}>
          <Autocomplete
            loading={loadingSavedReports}
            options={savedReports}
            value={selectedSavedReport}
            isOptionEqualToValue={(option, value) =>
              option.value === value.value
            }
            onChange={(_e, selected) =>
              handleLoadReport(selected as SavedReportOption | null)
            }
            noOptionsText="No saved reports found"
            width="100%"
            sx={{ width: '100%' }}
            inputProps={{
              placeholder: 'Load a saved report...',
            }}
          />
        </Box>

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
          {showDuplicate ? (
            <LoadingButton
              isLoading={isSaving}
              label="Duplicate"
              onClick={handleDuplicate}
              startIcon={<CopyIcon />}
              variant="outlined"
              color="secondary"
              sx={{ height: '36px', minWidth: '100px' }}
            />
          ) : (
            <LoadingButton
              isLoading={isSaving}
              label={selectedSavedReport ? 'Update' : 'Save'}
              onClick={handleSave}
              startIcon={<SaveIcon />}
              variant="outlined"
              color="secondary"
              sx={{ height: '36px', minWidth: '100px' }}
            />
          )}
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
            key={currentTab}
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
              border: '1px solid rgba(255,255,255,0.1)',
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
          detectedContext={detectedContext}
          options={options}
          loadingRecords={loadingRecords}
          selectedRecord={selectedRecord}
          setSelectedRecord={setSelectedRecord}
          error={error}
          hasContent={!!(template || query)}
        />

        <Box
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            minHeight: 0,
            width: '100%',
          }}
        >
          {reportUrl ? (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <iframe
                src={reportUrl}
                style={{ border: 'none', width: '1000px', height: '100%' }}
              />
            </Box>
          ) : (
            <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};