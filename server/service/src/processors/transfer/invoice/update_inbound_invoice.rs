use repository::{
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType,
    RepositoryError,
};

use crate::{
    activity_log::{log_type_from_invoice_status, system_activity_log_entry},
    invoice::common::get_lines_for_invoice,
    processors::transfer::invoice::{
        common::auto_verify_if_store_preference, InvoiceTransferOutput,
    },
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
};

use super::{
    common::{convert_invoice_line_to_single_pack, generate_inbound_lines},
    create_inbound_invoice::InboundInvoiceType,
    InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation,
};

const DESCRIPTION: &str = "Update inbound invoice from outbound invoice";

pub(crate) struct UpdateInboundInvoiceProcessor;

impl InvoiceTransferProcessor for UpdateInboundInvoiceProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound invoice will be updated when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is Outbound shipment or Supplier Return
    /// 3. Linked invoice exists (the inbound invoice)
    /// 4. Linked inbound invoice is Picked (Inbound invoice can only be updated before it turns to Shipped status)
    /// 5. Source outbound invoice is Shipped
    ///
    /// Only runs once:
    /// 6. Because linked inbound invoice will be changed to Shipped status and `4.` will never be true again
    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<InvoiceTransferOutput, RepositoryError> {
        // Check can execute
        let (outbound_invoice, linked_invoice) = match &record_for_processing.operation {
            Operation::Upsert {
                invoice,
                linked_invoice,
                ..
            } => (invoice, linked_invoice),
            operation => return Ok(InvoiceTransferOutput::WrongOperation(operation.to_owned())),
        };
        // 2.
        let inbound_invoice_type = match &outbound_invoice.invoice_row.r#type {
            InvoiceType::OutboundShipment => InboundInvoiceType::InboundShipment,
            InvoiceType::SupplierReturn => InboundInvoiceType::CustomerReturn,
            invoice_type => return Ok(InvoiceTransferOutput::WrongType(invoice_type.to_owned())),
        };
        // 3.
        let inbound_invoice = match &linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(InvoiceTransferOutput::NoLinkedInvoice),
        };
        // 4.
        if inbound_invoice.invoice_row.status != InvoiceStatus::Picked {
            return Ok(InvoiceTransferOutput::WrongInboundStatus(
                inbound_invoice.invoice_row.status.to_owned(),
            ));
        }
        // 5.
        if outbound_invoice.invoice_row.status != InvoiceStatus::Shipped {
            return Ok(InvoiceTransferOutput::WrongOutboundStatus(
                outbound_invoice.invoice_row.status.to_owned(),
            ));
        }

        // Execute
        let lines_to_delete =
            get_lines_for_invoice(&ctx.connection, &inbound_invoice.invoice_row.id)?;
        let new_inbound_lines = generate_inbound_lines(
            &ctx.connection,
            &inbound_invoice.invoice_row.id,
            &inbound_invoice.store_row.id,
            outbound_invoice,
        )?;

        let store_preferences =
            get_store_preferences(&ctx.connection, &inbound_invoice.invoice_row.store_id)?;
        let new_inbound_lines = match store_preferences.pack_to_one {
            true => convert_invoice_line_to_single_pack(new_inbound_lines),
            false => new_inbound_lines,
        };

        let invoice_line_repository = InvoiceLineRowRepository::new(&ctx.connection);

        for line in lines_to_delete.iter() {
            invoice_line_repository.delete(&line.invoice_line_row.id)?;
        }

        for line in new_inbound_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        let outbound_invoice_row = &outbound_invoice.invoice_row;

        let formatted_ref = match &outbound_invoice_row.their_reference {
            Some(reference) => format!(
                "From invoice number: {} ({})",
                outbound_invoice_row.invoice_number, reference
            ),
            None => format!(
                "From invoice number: {}",
                outbound_invoice_row.invoice_number
            ),
        };

        let formatted_comment = match inbound_invoice_type {
            InboundInvoiceType::InboundShipment => match &outbound_invoice_row.comment {
                Some(comment) => format!("Stock transfer ({comment})"),
                None => "Stock transfer".to_string(),
            },
            InboundInvoiceType::CustomerReturn => match &outbound_invoice_row.comment {
                Some(comment) => format!("Stock return ({comment})"),
                None => "Stock return".to_string(),
            },
        };

        let updated_inbound_invoice = InvoiceRow {
            // 6.
            status: InvoiceStatus::Shipped,
            picked_datetime: outbound_invoice_row.picked_datetime,
            shipped_datetime: outbound_invoice_row.shipped_datetime,
            their_reference: Some(formatted_ref),
            comment: Some(formatted_comment),
            transport_reference: outbound_invoice_row.transport_reference.clone(),
            tax_percentage: outbound_invoice_row.tax_percentage,
            currency_id: outbound_invoice_row.currency_id.clone(),
            currency_rate: outbound_invoice_row.currency_rate,
            expected_delivery_date: outbound_invoice_row.expected_delivery_date,

            ..inbound_invoice.invoice_row.clone()
        };

        InvoiceRowRepository::new(&ctx.connection).upsert_one(&updated_inbound_invoice)?;

        system_activity_log_entry(
            &ctx.connection,
            log_type_from_invoice_status(&updated_inbound_invoice.status, false),
            &updated_inbound_invoice.store_id,
            &updated_inbound_invoice.id,
        )?;

        auto_verify_if_store_preference(ctx, &updated_inbound_invoice)?;

        let result = format!(
            "invoice ({}) deleted lines ({:?}) inserted lines ({:?})",
            updated_inbound_invoice.id,
            lines_to_delete
                .into_iter()
                .map(|l| l.invoice_line_row.id)
                .collect::<Vec<String>>(),
            new_inbound_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
        );

        Ok(InvoiceTransferOutput::Processed(result))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{preference::PrefKey, service_provider::ServiceProvider};
    use chrono::Utc;
    use repository::{
        mock::{
            mock_name_a, mock_name_b, mock_outbound_shipment_a, mock_store_a, mock_store_b,
            MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, Invoice, InvoiceFilter, InvoiceRepository, PreferenceRow, StorageConnection,
    };

    #[actix_rt::test]
    async fn test_update_inbound_invoice_auto_finalise() {
        fn get_invoice_row(connection: &StorageConnection, id: String) -> InvoiceRow {
            InvoiceRepository::new(connection)
                .query_one(InvoiceFilter::new().id(EqualFilter::equal_to(id)))
                .unwrap()
                .unwrap()
                .invoice_row
        }

        let first_half_row = InvoiceRow {
            id: "picked_first_half".to_string(),
            status: InvoiceStatus::Picked,
            created_datetime: Utc::now().naive_utc(),
            ..mock_outbound_shipment_a()
        };
        let first_half = Invoice {
            invoice_row: first_half_row.clone(),
            name_row: mock_name_b(),
            store_row: mock_store_b(),
            clinician_row: None,
        };
        let second_half_row = InvoiceRow {
            id: "picked_second_half".to_string(),
            name_id: mock_name_a().id,
            store_id: mock_store_a().id,
            r#type: InvoiceType::InboundShipment,
            ..first_half_row.clone()
        };
        let second_half = Invoice {
            invoice_row: second_half_row.clone(),
            name_row: mock_name_a(),
            store_row: mock_store_a(),
            clinician_row: None,
        };
        let mut processor_input = InvoiceTransferProcessorRecord {
            operation: Operation::Upsert {
                invoice: first_half.clone(),
                linked_invoice: Some(second_half.clone()),
                linked_shipment_requisition: None,
                linked_original_shipment: None,
            },
            other_party_store_id: mock_store_a().id,
        };

        // First test without preference
        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_update_inbound_invoice_auto_finalise_off",
            MockDataInserts::none().stores(),
            MockData {
                invoices: vec![first_half_row.clone(), second_half_row.clone()],
                ..Default::default()
            },
        )
        .await;

        let ctx = &ServiceProvider::new(connection_manager)
            .basic_context()
            .unwrap();

        UpdateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &processor_input)
            .unwrap();

        let invoice = get_invoice_row(&ctx.connection, second_half_row.id.to_string());
        assert_eq!(
            invoice.status,
            InvoiceStatus::Picked,
            "The transfer should remain Picked if the first half is still Picked"
        );

        match processor_input.operation {
            Operation::Upsert {
                ref mut invoice, ..
            } => invoice.invoice_row.status = InvoiceStatus::Shipped,
            _ => (),
        }

        UpdateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &processor_input)
            .unwrap();

        let invoice = get_invoice_row(&ctx.connection, second_half_row.id.to_string());
        assert_eq!(
            invoice.status,
            InvoiceStatus::Shipped,
            "The transfer should remain Shipped if the first half is shipped and the auto verify preference is off"
        );

        // Setup for the test with the preference on
        let preference = PreferenceRow {
            id: "preference_on".to_string(),
            key: PrefKey::InboundShipmentAutoVerify.to_string(),
            value: "true".to_string(),
            store_id: Some("store_a".to_string()),
        };

        match processor_input.operation {
            Operation::Upsert {
                ref mut invoice, ..
            } => invoice.invoice_row.status = InvoiceStatus::Picked,
            _ => (),
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_update_inbound_invoice_auto_finalise_on",
            MockDataInserts::none().stores(),
            MockData {
                invoices: vec![first_half_row.clone(), second_half_row.clone()],
                preferences: vec![preference],
                ..Default::default()
            },
        )
        .await;

        let ctx = &ServiceProvider::new(connection_manager)
            .basic_context()
            .unwrap();

        UpdateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &processor_input)
            .unwrap();
        let invoice = get_invoice_row(&ctx.connection, second_half_row.id.to_string());
        assert_eq!(
            invoice.status,
            InvoiceStatus::Picked,
            "The transfer should remain Picked if the first half is still Picked"
        );

        match processor_input.operation {
            Operation::Upsert {
                ref mut invoice, ..
            } => invoice.invoice_row.status = InvoiceStatus::Shipped,
            _ => (),
        }

        UpdateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &processor_input)
            .unwrap();

        let invoice = get_invoice_row(&ctx.connection, second_half_row.id.to_string());
        assert_eq!(
            invoice.status,
            InvoiceStatus::Verified,
            "The transfer should be auto verified if the first half is shipped and the auto verify preference is on"
        );
    }
}
