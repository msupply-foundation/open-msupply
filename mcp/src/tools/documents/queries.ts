import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { formatListResult } from '../../types.js';

const DOCUMENTS_FRAGMENT = `
  documents {
    totalCount
    nodes {
      id
      tableName
      recordId
      fileName
      mimeType
      createdDatetime
    }
  }
`;

interface DocumentsConnector {
  totalCount: number;
  nodes: Record<string, unknown>[];
}

function formatDocuments(connector: DocumentsConnector | undefined | null): string {
  if (!connector || connector.totalCount === 0) {
    return 'No documents attached.';
  }
  return (
    formatListResult(
      'documents',
      connector.nodes,
      connector.totalCount,
      connector.totalCount,
      0
    ) +
    '\n\nTo download, use download_file with the document id. ' +
    'Note: documents are stored as sync files; the /files endpoint may only resolve generated/static files. ' +
    'If a download fails, the document may need to be retrieved via the sync_files endpoint instead.'
  );
}

export function documentQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_invoice_documents',
      category: 'documents',
      kind: 'query',
      description:
        'List documents (attachments) on a specific invoice (inbound or outbound shipment) by invoice id.',
      schema: {
        invoiceId: z.string().describe('The invoice id'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const id = args.invoiceId as string;

        const query = gql`
          query getInvoiceDocuments($id: String!, $storeId: String!) {
            invoice(id: $id, storeId: $storeId) {
              __typename
              ... on InvoiceNode {
                id
                invoiceNumber
                ${DOCUMENTS_FRAGMENT}
              }
              ... on NodeError {
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          invoice:
            | {
                __typename: 'InvoiceNode';
                id: string;
                invoiceNumber: number;
                documents: DocumentsConnector;
              }
            | { __typename: 'NodeError'; error: { description: string } };
        }>(query, { id, storeId });

        if (data.invoice.__typename === 'NodeError') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${data.invoice.error.description}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Invoice ${data.invoice.invoiceNumber} (${data.invoice.id}):\n${formatDocuments(data.invoice.documents)}`,
            },
          ],
        };
      },
    },
    {
      name: 'list_requisition_documents',
      category: 'documents',
      kind: 'query',
      description:
        'List documents (attachments) on a specific requisition by id. Includes documents on the linked requisition (the matching record on the other side of the transfer) if present.',
      schema: {
        requisitionId: z.string().describe('The requisition id'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const id = args.requisitionId as string;

        const query = gql`
          query getRequisitionDocuments($id: String!, $storeId: String!) {
            requisition(storeId: $storeId, id: $id) {
              __typename
              ... on RequisitionNode {
                id
                requisitionNumber
                ${DOCUMENTS_FRAGMENT}
              }
              ... on RecordNotFound {
                description
              }
            }
          }
        `;

        const data = await client.query<{
          requisition: {
            __typename: string;
            id?: string;
            requisitionNumber?: number;
            documents?: DocumentsConnector;
            description?: string;
          };
        }>(query, { id, storeId });

        const r = data.requisition;
        if (r.__typename !== 'RequisitionNode') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Requisition not found: ${r.description ?? r.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Requisition ${r.requisitionNumber} (${r.id}):\n${formatDocuments(r.documents)}`,
            },
          ],
        };
      },
    },
    {
      name: 'list_purchase_order_documents',
      category: 'documents',
      kind: 'query',
      description: 'List documents (attachments) on a specific purchase order by id.',
      schema: {
        purchaseOrderId: z.string().describe('The purchase order id'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const id = args.purchaseOrderId as string;

        const query = gql`
          query getPurchaseOrderDocuments($id: String!, $storeId: String!) {
            purchaseOrder(storeId: $storeId, id: $id) {
              __typename
              ... on PurchaseOrderNode {
                id
                number
                ${DOCUMENTS_FRAGMENT}
              }
              ... on RecordNotFound {
                description
              }
            }
          }
        `;

        const data = await client.query<{
          purchaseOrder: {
            __typename: string;
            id?: string;
            number?: number;
            documents?: DocumentsConnector;
            description?: string;
          };
        }>(query, { id, storeId });

        const po = data.purchaseOrder;
        if (po.__typename !== 'PurchaseOrderNode') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Purchase order not found: ${po.description ?? po.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Purchase order ${po.number} (${po.id}):\n${formatDocuments(po.documents)}`,
            },
          ],
        };
      },
    },
  ];
}
