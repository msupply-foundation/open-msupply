use chrono::{Duration, Months, NaiveDateTime, Utc};
use repository::{
    ActivityLogType, DatetimeFilter, EqualFilter, Invoice, InvoiceLineRowRepository, InvoiceRow,
    InvoiceRowRepository, InvoiceStatus, InvoiceType, NumberRowType, Pagination, RepositoryError,
    Requisition, Sort, StorageConnection, StoreFilter, StoreRepository, StoreRowRepository,
    SyncLogFilter, SyncLogRepository, SyncLogSortField,
};
use util::uuid::uuid;

use crate::{
    activity_log::system_activity_log_entry,
    number::next_number,
    preference::{Preference, PreventTransfersMonthsBeforeInitialisation},
    processors::transfer::invoice::{
        common::auto_verify_if_store_preference, InvoiceTransferOutput,
    },
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
};

use super::{
    common::{convert_invoice_line_to_single_pack, generate_inbound_lines},
    InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation,
};

const DESCRIPTION: &str = "Create inbound invoice from outbound invoice";

pub(crate) struct CreateInboundInvoiceProcessor;
pub enum InboundInvoiceType {
    CustomerReturn,
    InboundShipment,
}

impl InvoiceTransferProcessor for CreateInboundInvoiceProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound invoice will be created when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is either Outbound shipment or Supplier Return
    /// 3. Source outbound invoice is either Shipped or Picked
    ///    (outbounds can also be New or Allocated, but we only want to generate transfer when it's Shipped or Picked, as per
    ///     ./doc/omSupply_shipment_transfer_workflow.png)
    /// 4. The outbound_invoice.linked_invoice_id is None. This check rather than looking for the Some inbound invoice gives us an escape hatch to prevent transfers being generated.
    /// 5. Source invoice was not created a month before receiving store was created.
    /// 6. Source invoice was not picked more than 3 months before initialisation of the site that we skip generating the transfer
    ///
    /// Only runs once:
    /// 5. Because created inbound invoice will be linked to source outbound invoice `4.` will never be true again
    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<InvoiceTransferOutput, RepositoryError> {
        // Check can execute
        let (outbound_invoice, linked_invoice, request_requisition, original_shipment) =
            match &record_for_processing.operation {
                Operation::Upsert {
                    invoice: outbound_invoice,
                    linked_invoice,
                    linked_shipment_requisition: request_requisition,
                    linked_original_shipment: original_shipment,
                } => (
                    outbound_invoice,
                    linked_invoice,
                    request_requisition,
                    original_shipment,
                ),
                operation => {
                    return Ok(InvoiceTransferOutput::WrongOperation(operation.to_owned()))
                }
            };

        // 2.
        // Also get type for new invoice
        let new_invoice_type = match &outbound_invoice.invoice_row.r#type {
            InvoiceType::OutboundShipment => InboundInvoiceType::InboundShipment,
            InvoiceType::SupplierReturn => InboundInvoiceType::CustomerReturn,
            other => return Ok(InvoiceTransferOutput::WrongType(other.to_owned())),
        };

        // 3.
        if !matches!(
            &outbound_invoice.invoice_row.status,
            InvoiceStatus::Shipped | InvoiceStatus::Picked
        ) {
            return Ok(InvoiceTransferOutput::WrongOutboundStatus(
                outbound_invoice.invoice_row.status.to_owned(),
            ));
        }

        // 4.
        if linked_invoice.is_some() {
            return Ok(InvoiceTransferOutput::NoLinkedInvoice);
        }

        // 5.
        let store = StoreRowRepository::new(&ctx.connection)
            .find_one_by_id(&record_for_processing.other_party_store_id)?
            .ok_or(RepositoryError::NotFound)?;
        if let Some(created_date) = store.created_date {
            let store_created_datetime =
                NaiveDateTime::new(created_date - Duration::days(30), Default::default());
            let invoice_created_datetime = outbound_invoice.invoice_row.created_datetime;
            if invoice_created_datetime < store_created_datetime {
                return Ok(InvoiceTransferOutput::InvoiceCreatedBeforeStore);
            }
        }

        // 6.
        if outbound_invoice.invoice_row.status == InvoiceStatus::Picked {
            if let Some(picked_date) = outbound_invoice.invoice_row.picked_datetime {
                let pref_months = PreventTransfersMonthsBeforeInitialisation {}
                    .load(&ctx.connection, None)
                    .map_err(|e| RepositoryError::DBError {
                        msg: e.to_string(),
                        extra: "".to_string(),
                    })?;
                if pref_months > 0 {
                    let sort = Sort {
                        key: SyncLogSortField::DoneDatetime,
                        desc: None,
                    };

                    let filter = SyncLogFilter::new()
                        .integration_finished_datetime(DatetimeFilter::is_null(false));

                    let first_initialisation_log = SyncLogRepository::new(&ctx.connection)
                        .query(Pagination::one(), Some(filter), Some(sort))?
                        .pop();

                    if first_initialisation_log
                        .and_then(|log| log.sync_log_row.integration_finished_datetime)
                        .and_then(|initialisation_date| {
                            initialisation_date.checked_sub_months(Months::new(pref_months as u32))
                        })
                        .map_or(false, |cutoff_date| picked_date < cutoff_date)
                    {
                        return Ok(InvoiceTransferOutput::BeforeInitialisationMonths);
                    }
                }
            }
        }

        // Execute
        let new_inbound_invoice = generate_inbound_invoice(
            &ctx.connection,
            outbound_invoice,
            record_for_processing,
            request_requisition,
            original_shipment,
            new_invoice_type,
        )?;
        let new_inbound_lines = generate_inbound_lines(
            &ctx.connection,
            &new_inbound_invoice.id,
            &new_inbound_invoice.store_id,
            outbound_invoice,
        )?;
        let store_preferences =
            get_store_preferences(&ctx.connection, &new_inbound_invoice.store_id)?;

        let new_inbound_lines = match store_preferences.pack_to_one {
            true => convert_invoice_line_to_single_pack(new_inbound_lines),
            false => new_inbound_lines,
        };

        InvoiceRowRepository::new(&ctx.connection).upsert_one(&new_inbound_invoice)?;

        system_activity_log_entry(
            &ctx.connection,
            ActivityLogType::InvoiceCreated,
            &new_inbound_invoice.store_id,
            &new_inbound_invoice.id,
        )?;

        let invoice_line_repository = InvoiceLineRowRepository::new(&ctx.connection);

        for line in new_inbound_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        auto_verify_if_store_preference(ctx, &new_inbound_invoice)?;

        let result = format!(
            "invoice ({}) lines ({:?}) source invoice ({})",
            new_inbound_invoice.id,
            new_inbound_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
            outbound_invoice.invoice_row.id
        );

        Ok(InvoiceTransferOutput::Processed(result))
    }
}

fn generate_inbound_invoice(
    connection: &StorageConnection,
    outbound_invoice: &Invoice,
    record_for_processing: &InvoiceTransferProcessorRecord,
    request_requisition: &Option<Requisition>,
    original_shipment: &Option<Invoice>,
    r#type: InboundInvoiceType,
) -> Result<InvoiceRow, RepositoryError> {
    let store_id = record_for_processing.other_party_store_id.clone();
    let name_id = StoreRepository::new(connection)
        .query_by_filter(StoreFilter::new().id(EqualFilter::equal_to(
            outbound_invoice.store_row.id.to_string(),
        )))?
        .pop()
        .ok_or(RepositoryError::NotFound)?
        .name_row
        .id;

    let outbound_invoice_row = &outbound_invoice.invoice_row;

    let status = match &outbound_invoice_row.status {
        InvoiceStatus::Picked => InvoiceStatus::Picked,
        InvoiceStatus::Shipped => InvoiceStatus::Shipped,
        _ => InvoiceStatus::New,
    };

    let request_requisition_id = request_requisition
        .as_ref()
        .map(|r| r.requisition_row.id.clone());

    let original_shipment_id = original_shipment.as_ref().map(|s| s.invoice_row.id.clone());

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

    let formatted_comment = match r#type {
        InboundInvoiceType::InboundShipment => match &outbound_invoice_row.comment {
            Some(comment) => format!("Stock transfer ({})", comment),
            None => "Stock transfer".to_string(),
        },
        InboundInvoiceType::CustomerReturn => match &outbound_invoice_row.comment {
            Some(comment) => format!("Stock return ({})", comment),
            None => "Stock return".to_string(),
        },
    };

    let result = InvoiceRow {
        id: uuid(),
        invoice_number: next_number(
            connection,
            &match r#type {
                InboundInvoiceType::InboundShipment => NumberRowType::InboundShipment,
                InboundInvoiceType::CustomerReturn => NumberRowType::CustomerReturn,
            },
            &store_id,
        )?,
        r#type: match r#type {
            InboundInvoiceType::CustomerReturn => InvoiceType::CustomerReturn,
            InboundInvoiceType::InboundShipment => InvoiceType::InboundShipment,
        },
        name_id: name_id,
        store_id,
        status,
        requisition_id: request_requisition_id,
        name_store_id: Some(outbound_invoice_row.store_id.clone()),
        their_reference: Some(formatted_ref),
        // 5.
        linked_invoice_id: Some(outbound_invoice_row.id.clone()),
        created_datetime: Utc::now().naive_utc(),
        picked_datetime: outbound_invoice_row.picked_datetime,
        shipped_datetime: outbound_invoice_row.shipped_datetime,
        transport_reference: outbound_invoice_row.transport_reference.clone(),
        comment: Some(formatted_comment),
        tax_percentage: outbound_invoice_row.tax_percentage,
        currency_id: outbound_invoice_row.currency_id.clone(),
        currency_rate: outbound_invoice_row.currency_rate,
        expected_delivery_date: outbound_invoice_row.expected_delivery_date,
        original_shipment_id,
        program_id: outbound_invoice_row.program_id.clone(),
        shipping_method_id: outbound_invoice_row.shipping_method_id.clone(),
        // Default
        colour: None,
        user_id: None,
        on_hold: false,
        allocated_datetime: None,
        delivered_datetime: None,
        received_datetime: None,
        verified_datetime: None,
        cancelled_datetime: None,
        clinician_link_id: None,
        backdated_datetime: None,
        diagnosis_id: None,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,
        is_cancellation: false,
        default_donor_link_id: None,
        goods_received_id: None,
    };

    Ok(result)
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{preference::PrefKey, service_provider::ServiceProvider};
    use chrono::NaiveDate;
    use repository::{
        mock::{mock_name_b, mock_outbound_shipment_a, mock_store_b, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceFilter, InvoiceRepository, PreferenceRow, SyncLogRow,
    };

    #[actix_rt::test]
    async fn test_create_inbound_invoice_picked_cutoff() {
        let log_1 = SyncLogRow {
            id: "sync_log_1".to_string(),
            integration_finished_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 01, 01)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            ..Default::default()
        };

        let log_2 = SyncLogRow {
            id: "sync_log_2".to_string(),
            integration_finished_datetime: Some(
                NaiveDate::from_ymd_opt(2024, 01, 01)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            ..Default::default()
        };

        let log_3 = SyncLogRow {
            id: "sync_log_3".to_string(),
            integration_finished_datetime: None,
            ..Default::default()
        };

        let invoice_row_old = InvoiceRow {
            id: "invoice_row_old".to_string(),
            status: InvoiceStatus::Picked,
            created_datetime: NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2020, 6, 6).unwrap(),
                Default::default(),
            ),
            picked_datetime: Some(NaiveDateTime::new(
                NaiveDate::from_ymd_opt(2020, 6, 6).unwrap(),
                Default::default(),
            )),
            ..mock_outbound_shipment_a()
        };
        let invoice_old = Invoice {
            invoice_row: invoice_row_old.clone(),
            name_row: mock_name_b(),
            store_row: mock_store_b(),
            clinician_row: None,
        };
        let invoice_transfer_old = InvoiceTransferProcessorRecord {
            operation: Operation::Upsert {
                invoice: invoice_old.clone(),
                linked_invoice: None,
                linked_shipment_requisition: None,
                linked_original_shipment: None,
            },
            other_party_store_id: "store_a".to_string(),
        };

        let invoice_row_new = InvoiceRow {
            id: "invoice_row_new".to_string(),
            picked_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 8, 7)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            ..invoice_row_old.clone()
        };
        let invoice_new = Invoice {
            invoice_row: invoice_row_new.clone(),
            ..invoice_old.clone()
        };
        let invoice_transfer_new = InvoiceTransferProcessorRecord {
            operation: Operation::Upsert {
                invoice: invoice_new.clone(),
                linked_invoice: None,
                linked_shipment_requisition: None,
                linked_original_shipment: None,
            },
            other_party_store_id: "store_a".to_string(),
        };

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_create_inbound_invoice_picked_cutoff",
            MockDataInserts::none().stores(),
            MockData {
                invoices: vec![invoice_row_old, invoice_row_new],
                sync_logs: vec![log_1, log_2, log_3],
                ..Default::default()
            },
        )
        .await;

        let service_provider = &ServiceProvider::new(connection_manager);
        let ctx = service_provider.basic_context().unwrap();

        let processor = CreateInboundInvoiceProcessor {};
        let result = processor
            .try_process_record(&ctx, &invoice_transfer_old)
            .unwrap();
        assert!(
            matches!(result, InvoiceTransferOutput::BeforeInitialisationMonths),
            "The old invoice was skipped for wrong reason: {:?}",
            result
        );

        let result = processor
            .try_process_record(&ctx, &invoice_transfer_new)
            .unwrap();
        assert!(
            matches!(result, InvoiceTransferOutput::Processed(_)),
            "The new invoice should have had a transfer generated, skipped because: {:?}",
            result
        );
    }

    #[actix_rt::test]
    async fn test_create_inbound_invoice_auto_finalise() {
        fn make_invoice(
            id: &str,
            status: InvoiceStatus,
            r#type: InvoiceType,
        ) -> (InvoiceTransferProcessorRecord, InvoiceRow) {
            let invoice_row = InvoiceRow {
                id: id.to_string(),
                status,
                created_datetime: Utc::now().naive_utc(),
                r#type,
                ..mock_outbound_shipment_a()
            };
            let invoice = Invoice {
                invoice_row: invoice_row.clone(),
                name_row: mock_name_b(),
                store_row: mock_store_b(),
                clinician_row: None,
            };
            (
                InvoiceTransferProcessorRecord {
                    operation: Operation::Upsert {
                        invoice,
                        linked_invoice: None,
                        linked_shipment_requisition: None,
                        linked_original_shipment: None,
                    },
                    other_party_store_id: "store_a".to_string(),
                },
                invoice_row,
            )
        }

        let (new_status_invoice_input, new_invoice_row) = make_invoice(
            "new_status",
            InvoiceStatus::New,
            InvoiceType::OutboundShipment,
        );
        let (picked_status_invoice_input, picked_invoice_row) = make_invoice(
            "picked_status",
            InvoiceStatus::Picked,
            InvoiceType::OutboundShipment,
        );
        let (shipped_status_invoice_input, shipped_invoice_row) = make_invoice(
            "shipped_status",
            InvoiceStatus::Shipped,
            InvoiceType::OutboundShipment,
        );
        let (supplier_return_shipped, supplier_return_row) = make_invoice(
            "shipped_supplier_credit",
            InvoiceStatus::Shipped,
            InvoiceType::SupplierReturn,
        );

        // First test without preference
        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_create_inbound_invoice_auto_finalise_off",
            MockDataInserts::none().stores(),
            MockData {
                invoices: vec![
                    new_invoice_row.clone(),
                    picked_invoice_row.clone(),
                    shipped_invoice_row.clone(),
                    supplier_return_row.clone(),
                ],
                ..Default::default()
            },
        )
        .await;

        let ctx = &ServiceProvider::new(connection_manager)
            .basic_context()
            .unwrap();

        fn get_linked_invoice(connection: &StorageConnection, id: String) -> Option<Invoice> {
            InvoiceRepository::new(connection)
                .query_one(InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(id)))
                .unwrap()
        }

        CreateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &new_status_invoice_input)
            .unwrap();

        let invoice = get_linked_invoice(&ctx.connection, new_invoice_row.id.to_string());
        assert!(
            invoice.is_none(),
            "The transfer should not be made for a new invoice"
        );

        CreateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &picked_status_invoice_input)
            .unwrap();
        let invoice_status = get_linked_invoice(&ctx.connection, picked_invoice_row.id.to_string())
            .unwrap()
            .invoice_row
            .status;
        assert_eq!(
            invoice_status,
            InvoiceStatus::Picked,
            "The transfer should remain Picked if the first half is just Picked"
        );

        CreateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &shipped_status_invoice_input)
            .unwrap();
        let invoice_status =
            get_linked_invoice(&ctx.connection, shipped_invoice_row.id.to_string())
                .unwrap()
                .invoice_row
                .status;
        assert_eq!(
            invoice_status,
            InvoiceStatus::Shipped,
            "The transfer should remain Shipped if the first half is shipped and the auto verify preference is off"
        );

        let preference = PreferenceRow {
            id: "preference_on".to_string(),
            key: PrefKey::InboundShipmentAutoVerify.to_string(),
            value: "true".to_string(),
            store_id: Some("store_a".to_string()),
        };

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_create_inbound_invoice_auto_finalise_on",
            MockDataInserts::none().stores(),
            MockData {
                invoices: vec![
                    new_invoice_row.clone(),
                    picked_invoice_row.clone(),
                    shipped_invoice_row.clone(),
                ],
                preferences: vec![preference],
                ..Default::default()
            },
        )
        .await;
        let ctx = &ServiceProvider::new(connection_manager)
            .basic_context()
            .unwrap();

        CreateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &picked_status_invoice_input)
            .unwrap();
        let invoice_status = get_linked_invoice(&ctx.connection, picked_invoice_row.id.to_string())
            .unwrap()
            .invoice_row
            .status;
        assert_eq!(
            invoice_status,
            InvoiceStatus::Picked,
            "The transfer should remain Picked if the first half is just Picked"
        );

        CreateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &shipped_status_invoice_input)
            .unwrap();
        let invoice_status =
            get_linked_invoice(&ctx.connection, shipped_invoice_row.id.to_string())
                .unwrap()
                .invoice_row
                .status;
        assert_eq!(
            invoice_status,
            InvoiceStatus::Verified,
            "The transfer should be auto verified if the first half is shipped and the auto verify preference is on"
        );

        CreateInboundInvoiceProcessor {}
            .try_process_record(&ctx, &supplier_return_shipped)
            .unwrap();

        let invoice_status =
            get_linked_invoice(&ctx.connection, supplier_return_row.id.to_string())
                .unwrap()
                .invoice_row
                .status;
        assert_eq!(
            invoice_status,
            InvoiceStatus::Shipped,
            "Only inbound shipments should get a transfer created"
        );
    }
}
