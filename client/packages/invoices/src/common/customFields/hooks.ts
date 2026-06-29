import {
  InvoiceNodeType,
  useGql,
  useQuery,
  UserPermission,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

/**
 * `property_table_v2.table_name` scope for each invoice type that supports
 * properties (matches `invoice_property_table_name` on the server). Repack and
 * inventory adjustments have no scope, hence no entry.
 */
export const INVOICE_PROPERTIES_SCOPE: Partial<Record<InvoiceNodeType, string>> =
  {
    [InvoiceNodeType.InboundShipment]: 'inbound_shipment',
    [InvoiceNodeType.OutboundShipment]: 'outbound_shipment',
    [InvoiceNodeType.Prescription]: 'prescription',
    [InvoiceNodeType.SupplierReturn]: 'supplier_return',
    [InvoiceNodeType.CustomerReturn]: 'customer_return',
  };

/**
 * The permission gating property edits for each invoice type. Shared by both
 * surfaces that edit customFields — the Properties tab and the toolbar — so the
 * same property is editable under the same rules in both places (the server
 * enforces it on save regardless; this is the client gate).
 */
export const INVOICE_PROPERTY_MUTATE_PERMISSION: Partial<
  Record<InvoiceNodeType, UserPermission>
> = {
  [InvoiceNodeType.InboundShipment]: UserPermission.InboundShipmentMutate,
  [InvoiceNodeType.OutboundShipment]: UserPermission.OutboundShipmentMutate,
  [InvoiceNodeType.Prescription]: UserPermission.PrescriptionMutate,
  [InvoiceNodeType.SupplierReturn]: UserPermission.SupplierReturnMutate,
  [InvoiceNodeType.CustomerReturn]: UserPermission.CustomerReturnMutate,
};

const INVOICE_PROPERTIES_V2 = 'invoice_properties_v2';

const useCustomFieldsGraphQL = () => {
  const { client } = useGql();
  const api = getSdk(client);

  return { api };
};

/**
 * Fetch the customFields definitions for one invoice type's scope. The value
 * blob alone isn't renderable — the definitions carry the human label (`name`),
 * the `valueType` (to pick the right control) and the options to resolve
 * OPTION values.
 */
export const useInvoiceCustomFields = (invoiceType: InvoiceNodeType) => {
  const { api } = useCustomFieldsGraphQL();
  const tableName = INVOICE_PROPERTIES_SCOPE[invoiceType];

  return useQuery({
    queryKey: [INVOICE_PROPERTIES_V2, tableName],
    enabled: !!tableName,
    queryFn: async () => {
      if (!tableName) return [];
      const result = await api.invoiceCustomFields({ tableName });
      if (result?.customFields?.__typename === 'CustomFieldConnector') {
        return result.customFields.nodes;
      }
      throw new Error('Unable to fetch invoice properties');
    },
  });
};

