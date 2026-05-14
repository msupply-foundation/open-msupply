import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { formatListResult, formatRecord } from '../../types.js';

const REPORT_CONTEXTS = [
  'ASSET',
  'INBOUND_SHIPMENT',
  'OUTBOUND_SHIPMENT',
  'REQUISITION',
  'STOCKTAKE',
  'RESOURCE',
  'PATIENT',
  'DISPENSARY',
  'REPACK',
  'OUTBOUND_RETURN',
  'INBOUND_RETURN',
  'REPORT',
  'PRESCRIPTION',
  'INTERNAL_ORDER',
  'PURCHASE_ORDER',
  'SUPPLIER_RETURN',
  'CUSTOMER_RETURN',
] as const;

const PRINT_FORMATS = ['PDF', 'HTML', 'EXCEL'] as const;

export function reportQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_reports',
      category: 'reports',
      kind: 'query',
      description:
        'List available reports for the active store. Optionally filter by report context (e.g. OUTBOUND_SHIPMENT, REQUISITION, STOCKTAKE) or by name. Use the returned id with generate_report.',
      schema: {
        context: z
          .enum(REPORT_CONTEXTS)
          .optional()
          .describe('Filter by report context'),
        search: z.string().optional().describe('Search by report name (partial match)'),
        userLanguage: z
          .string()
          .optional()
          .describe('Language code for report translations (default: en)'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const userLanguage = (args.userLanguage as string) ?? 'en';

        const filter: Record<string, unknown> = {};
        if (args.context) {
          filter.context = { equalTo: args.context };
        }
        if (args.search) {
          filter.name = { like: args.search };
        }

        const query = gql`
          query listReports(
            $storeId: String!
            $userLanguage: String!
            $filter: ReportFilterInput
            $sort: [ReportSortInput!]
          ) {
            reports(
              storeId: $storeId
              userLanguage: $userLanguage
              filter: $filter
              sort: $sort
            ) {
              ... on ReportConnector {
                totalCount
                nodes {
                  id
                  name
                  code
                  context
                  subContext
                  isCustom
                  isActive
                  version
                }
              }
              ... on QueryReportsError {
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          reports:
            | {
                totalCount: number;
                nodes: Record<string, unknown>[];
              }
            | { error: { description: string } };
        }>(query, {
          storeId,
          userLanguage,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        });

        if ('error' in data.reports) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error listing reports: ${data.reports.error.description}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: formatListResult(
                'reports',
                data.reports.nodes,
                data.reports.totalCount,
                data.reports.totalCount,
                0
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_report',
      category: 'reports',
      kind: 'query',
      description:
        'Get details for a single report by id, including its argument schema (which describes what arguments generate_report accepts for this report).',
      schema: {
        id: z.string().describe('The report id'),
        userLanguage: z
          .string()
          .optional()
          .describe('Language code for report translations (default: en)'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const id = args.id as string;
        const userLanguage = (args.userLanguage as string) ?? 'en';

        const query = gql`
          query getReport(
            $storeId: String!
            $userLanguage: String!
            $id: String!
          ) {
            report(storeId: $storeId, userLanguage: $userLanguage, id: $id) {
              ... on ReportNode {
                id
                name
                code
                context
                subContext
                isCustom
                isActive
                version
                argumentSchema {
                  id
                  jsonSchema
                  uiSchema
                  type
                }
              }
              ... on QueryReportError {
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          report: Record<string, unknown> | { error: { description: string } };
        }>(query, { storeId, userLanguage, id });

        if ('error' in data.report && data.report.error) {
          const err = data.report.error as { description: string };
          return {
            content: [
              { type: 'text' as const, text: `Error fetching report: ${err.description}` },
            ],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text' as const, text: formatRecord(data.report) }],
        };
      },
    },
    {
      name: 'generate_report',
      category: 'reports',
      kind: 'query',
      description:
        'Generate a report and return the file id. The file id can be passed to download_file to fetch the generated output. Use list_reports to find a report id; for record-specific reports (invoice, requisition, etc.) pass the record id as dataId.',
      schema: {
        reportId: z.string().describe('The report id (from list_reports)'),
        dataId: z
          .string()
          .optional()
          .describe(
            'Record id the report runs against (e.g. invoice id for an invoice report). Optional for reports that take no record.'
          ),
        format: z
          .enum(PRINT_FORMATS)
          .optional()
          .describe('Output format. Defaults to the report definition\'s default (usually Pdf).'),
        arguments: z
          .record(z.unknown())
          .optional()
          .describe(
            'Report arguments matching the argumentSchema returned by get_report. Pass as a JSON object.'
          ),
        currentLanguage: z
          .string()
          .optional()
          .describe('Language code for rendered report text (default: en)'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const reportId = args.reportId as string;

        const query = gql`
          query generateReport(
            $storeId: String!
            $reportId: String!
            $dataId: String
            $format: PrintFormat
            $arguments: JSON
            $currentLanguage: String
          ) {
            generateReport(
              storeId: $storeId
              reportId: $reportId
              dataId: $dataId
              format: $format
              arguments: $arguments
              currentLanguage: $currentLanguage
            ) {
              ... on PrintReportNode {
                fileId
              }
              ... on PrintReportError {
                error {
                  description
                  ... on FailedToFetchReportData {
                    errors
                  }
                }
              }
            }
          }
        `;

        const data = await client.query<{
          generateReport:
            | { fileId: string }
            | { error: { description: string; errors?: unknown } };
        }>(query, {
          storeId,
          reportId,
          dataId: args.dataId ?? null,
          format: args.format ?? null,
          arguments: args.arguments ?? null,
          currentLanguage: args.currentLanguage ?? null,
        });

        if ('error' in data.generateReport) {
          const err = data.generateReport.error;
          const extra = err.errors ? `\nDetails: ${JSON.stringify(err.errors)}` : '';
          return {
            content: [
              {
                type: 'text' as const,
                text: `Report generation failed: ${err.description}${extra}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Report generated. fileId: ${data.generateReport.fileId}\nUse download_file with this id to fetch the output.`,
            },
          ],
        };
      },
    },
  ];
}
