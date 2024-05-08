use repository::{
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType,
    RepositoryError, StorageConnection,
};

use crate::{
    activity_log::{log_type_from_invoice_status, system_activity_log_entry},
    invoice::common::get_lines_for_invoice,
    store_preference::get_store_preferences,
};

use super::{
    common::{convert_invoice_line_to_single_pack, generate_inbound_shipment_lines},
    Operation, ShipmentTransferProcessor, ShipmentTransferProcessorRecord,
};

const DESCRIPTION: &str = "Update inbound shipment from outbound shipment";

pub(crate) struct UpdateInboundShipmentProcessor;

impl ShipmentTransferProcessor for UpdateInboundShipmentProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound shipment will be updated when all below conditions are met:
    ///
    /// 1. Source shipment name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source shipment is Outbound shipment or Outbound Return
    /// 3. Linked shipment exists (the inbound shipment)
    /// 4. Linked inbound shipment is Picked (Inbound shipment can only be deleted before it turns to Shipped status)
    /// 5. Source outbound shipment is Shipped
    ///
    /// Only runs once:
    /// 6. Because linked inbound shipment will be changed to Shipped status and `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &ShipmentTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (outbound_shipment, linked_shipment) = match &record_for_processing.operation {
            Operation::Upsert {
                shipment,
                linked_shipment,
                ..
            } => (shipment, linked_shipment),
            _ => return Ok(None),
        };
        // 2.
        if !matches!(
            outbound_shipment.invoice_row.r#type,
            InvoiceType::OutboundShipment | InvoiceType::OutboundReturn
        ) {
            return Ok(None);
        }
        // 3.
        let inbound_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };
        // 4.
        if inbound_shipment.invoice_row.status != InvoiceStatus::Picked {
            return Ok(None);
        }
        // 5.
        if outbound_shipment.invoice_row.status != InvoiceStatus::Shipped {
            return Ok(None);
        }

        // Execute
        let lines_to_delete = get_lines_for_invoice(connection, &inbound_shipment.invoice_row.id)?;
        let new_inbound_lines = generate_inbound_shipment_lines(
            connection,
            &inbound_shipment.invoice_row.id,
            outbound_shipment,
        )?;

        let store_preferences =
            get_store_preferences(connection, &inbound_shipment.invoice_row.store_id)?;
        let new_inbound_lines = match store_preferences.pack_to_one {
            true => convert_invoice_line_to_single_pack(new_inbound_lines),
            false => new_inbound_lines,
        };

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in lines_to_delete.iter() {
            invoice_line_repository.delete(&line.invoice_line_row.id)?;
        }

        for line in new_inbound_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        let updated_inbound_shipment = InvoiceRow {
            // 6.
            status: InvoiceStatus::Shipped,
            shipped_datetime: outbound_shipment.invoice_row.shipped_datetime,
            ..inbound_shipment.invoice_row.clone()
        };

        InvoiceRowRepository::new(connection).upsert_one(&updated_inbound_shipment)?;

        system_activity_log_entry(
            connection,
            log_type_from_invoice_status(&updated_inbound_shipment.status, false),
            &updated_inbound_shipment.store_id,
            &updated_inbound_shipment.id,
        )?;

        let result = format!(
            "shipment ({}) deleted lines ({:?}) inserted lines ({:?})",
            updated_inbound_shipment.id,
            lines_to_delete
                .into_iter()
                .map(|l| l.invoice_row.id)
                .collect::<Vec<String>>(),
            new_inbound_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
        );

        Ok(Some(result))
    }
}
