import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Tab,
  TabContext,
  TabList,
  TextArea,
  Typography,
  useAuthContext,
  useQuery,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';
import { useHostApi } from '../api/hooks/utils/useHostApi';
import { useGenerateOneOffReport } from '../api/hooks/settings/useGenerateOneOffReport';

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
        : 'Preview Record'}
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

const editorSx = {
  fontFamily: 'monospace',
  fontSize: '13px',
  height: '100%',
  overflow: 'auto',
  alignItems: 'flex-start',
};

export const ReportBuilder: React.FC = () => {
  const { storeId } = useAuthContext();
  const [currentTab, setCurrentTab] = useState<EditorTab>(EditorTab.Query);
  const [template, setTemplate] = useState('');
  const [header, setHeader] = useState('');
  const [style, setStyle] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<RecordOption | null>(null);
  const [reportUrl, setReportUrl] = useState('');
  const [error, setError] = useState('');

  const detectedContext = useMemo(() => detectContext(query), [query]);
  const { options, isLoading: loadingRecords } = useRecordOptions(detectedContext, storeId);
  const { mutateAsync: renderReport } = useGenerateOneOffReport();

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
