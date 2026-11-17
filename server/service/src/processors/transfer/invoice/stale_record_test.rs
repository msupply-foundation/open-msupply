//! A transfer step reads the other half of the transfer when its record is built, not when it
//! writes. The API can change that half in between, and so can an earlier step running on the same
//! record. These tests build the record, change the row in the database, then run the step, and
//! check the step changes only the fields it owns and doesn't write the old copy back.

use chrono::{NaiveDate, Utc};
use repository::{
    EqualFilter, Invoice, InvoiceFilter, InvoiceLineRow, InvoiceLineType, InvoiceRepository,
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, StorageConnection,
    mock::{
        MockData, MockDataInserts, mock_item_a, mock_name_store_a, mock_name_store_b, mock_store_a,
        mock_store_b,
    },
    test_db::setup_all_with_data,
};

use crate::service_provider::{ServiceContext, ServiceProvider};

use super::{
    InvoiceTransferOutput, InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation,
    assign_invoice_number::AssignInvoiceNumberProcessor,
    delete_inbound_invoice::DeleteInboundInvoiceProcessor,
    link_outbound_invoice::LinkOutboundInvoiceProcessor,
    update_inbound_invoice::UpdateInboundInvoiceProcessor,
    update_outbound_invoice_status::UpdateOutboundInvoiceStatusProcessor,
};

fn datetime(day: u32) -> chrono::NaiveDateTime {
    NaiveDate::from_ymd_opt(2026, 11, day)
        .unwrap()
        .and_hms_opt(9, 0, 0)
        .unwrap()
}

fn outbound_row(id: &str, status: InvoiceStatus) -> InvoiceRow {
    InvoiceRow {
        id: id.to_string(),
        name_id: mock_name_store_a().id,
        store_id: mock_store_b().id,
        invoice_number: 10,
        r#type: InvoiceType::OutboundShipment,
        status,
        created_datetime: Utc::now().naive_utc(),
        picked_datetime: Some(datetime(1)),
        ..Default::default()
    }
}

fn inbound_row(id: &str, outbound_id: &str, status: InvoiceStatus) -> InvoiceRow {
    InvoiceRow {
        id: id.to_string(),
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        invoice_number: 20,
        r#type: InvoiceType::InboundShipment,
        status,
        created_datetime: Utc::now().naive_utc(),
        picked_datetime: Some(datetime(1)),
        linked_invoice_id: Some(outbound_id.to_string()),
        ..Default::default()
    }
}

fn outbound_line(outbound_id: &str) -> InvoiceLineRow {
    InvoiceLineRow {
        id: format!("{outbound_id}_line"),
        invoice_id: outbound_id.to_string(),
        item_id: mock_item_a().id,
        item_name: mock_item_a().name,
        item_code: mock_item_a().code,
        r#type: InvoiceLineType::StockOut,
        pack_size: 1.0,
        number_of_packs: 10.0,
        ..Default::default()
    }
}

async fn setup(
    test_name: &str,
    invoices: Vec<InvoiceRow>,
    lines: Vec<InvoiceLineRow>,
) -> ServiceContext {
    let (_, _, connection_manager, _) = setup_all_with_data(
        test_name,
        MockDataInserts::none().names().stores().units().items(),
        MockData {
            invoices,
            invoice_lines: lines,
            ..Default::default()
        },
    )
    .await;

    ServiceProvider::new(connection_manager)
        .basic_context()
        .unwrap()
}

fn invoice(connection: &StorageConnection, id: &str) -> Invoice {
    InvoiceRepository::new(connection)
        .query_one(InvoiceFilter::new().id(EqualFilter::equal_to(id.to_string())))
        .unwrap()
        .unwrap()
}

fn invoice_row(connection: &StorageConnection, id: &str) -> InvoiceRow {
    invoice(connection, id).invoice_row
}

/// The record for `invoice_id`, with its linked invoice, as `get_upsert_operation` reads them
fn read_record(
    connection: &StorageConnection,
    invoice_id: &str,
    linked_id: &str,
) -> InvoiceTransferProcessorRecord {
    let invoice = invoice(connection, invoice_id);
    let other_party_store_id = invoice.name_row.id.clone();
    InvoiceTransferProcessorRecord {
        operation: Operation::Upsert {
            invoice,
            linked_invoice: Some(self::invoice(connection, linked_id)),
            linked_shipment_requisition: None,
            linked_original_shipment: None,
        },
        other_party_store_id,
    }
}

fn update_row(connection: &StorageConnection, row: InvoiceRow) {
    InvoiceRowRepository::new(connection)
        .upsert_one(&row)
        .unwrap();
}

/// The race seen in e2e: an outbound shipment is picked, then shipped moments later. The inbound
/// shipment's record still holds the outbound as Picked when the link is written, and writing that
/// copy back put the outbound back to Picked
#[actix_rt::test]
async fn link_keeps_outbound_changes_made_after_record_read() {
    let outbound = outbound_row("link_race_outbound", InvoiceStatus::Picked);
    let inbound = inbound_row("link_race_inbound", &outbound.id, InvoiceStatus::Picked);
    let ctx = setup(
        "link_keeps_outbound_changes_made_after_record_read",
        vec![outbound.clone(), inbound.clone()],
        vec![],
    )
    .await;

    let record = read_record(&ctx.connection, &inbound.id, &outbound.id);

    // The outbound is shipped after the record was read
    update_row(
        &ctx.connection,
        InvoiceRow {
            status: InvoiceStatus::Shipped,
            shipped_datetime: Some(datetime(2)),
            ..outbound.clone()
        },
    );

    let result = LinkOutboundInvoiceProcessor
        .try_process_record(&ctx, &record)
        .unwrap();
    assert!(
        matches!(result, InvoiceTransferOutput::Processed(_)),
        "expected the link to be written, got {result:?}"
    );

    let outbound_after = invoice_row(&ctx.connection, &outbound.id);
    assert_eq!(outbound_after.linked_invoice_id, Some(inbound.id.clone()));
    assert_eq!(
        outbound_after.status,
        InvoiceStatus::Shipped,
        "linking must not put a shipped outbound back to Picked"
    );
    assert_eq!(outbound_after.shipped_datetime, Some(datetime(2)));
}

/// "Already linked" is checked against the outbound as it is now, not as the record read it
#[actix_rt::test]
async fn link_skips_outbound_linked_after_record_read() {
    let outbound = outbound_row("link_guard_outbound", InvoiceStatus::Picked);
    let inbound = inbound_row("link_guard_inbound", &outbound.id, InvoiceStatus::Picked);
    let ctx = setup(
        "link_skips_outbound_linked_after_record_read",
        vec![outbound.clone(), inbound.clone()],
        vec![],
    )
    .await;

    let record = read_record(&ctx.connection, &inbound.id, &outbound.id);

    update_row(
        &ctx.connection,
        InvoiceRow {
            linked_invoice_id: Some(inbound.id.clone()),
            ..outbound.clone()
        },
    );

    let result = LinkOutboundInvoiceProcessor
        .try_process_record(&ctx, &record)
        .unwrap();
    assert!(
        matches!(result, InvoiceTransferOutput::AlreadyLinked),
        "expected AlreadyLinked, got {result:?}"
    );
}

/// The transfer processor runs every step on one record in turn. When an inbound shipment reaches
/// the outbound's site already Delivered, linking and the status update both run on it, and the
/// status update must not write back the outbound the record read before it was linked
#[actix_rt::test]
async fn link_then_status_update_on_one_record_keeps_both() {
    let outbound = outbound_row("link_status_outbound", InvoiceStatus::Shipped);
    let inbound = InvoiceRow {
        delivered_datetime: Some(datetime(3)),
        ..inbound_row(
            "link_status_inbound",
            &outbound.id,
            InvoiceStatus::Delivered,
        )
    };
    let ctx = setup(
        "link_then_status_update_on_one_record_keeps_both",
        vec![outbound.clone(), inbound.clone()],
        vec![],
    )
    .await;

    let record = read_record(&ctx.connection, &inbound.id, &outbound.id);

    LinkOutboundInvoiceProcessor
        .try_process_record(&ctx, &record)
        .unwrap();
    let result = UpdateOutboundInvoiceStatusProcessor
        .try_process_record(&ctx, &record)
        .unwrap();
    assert!(
        matches!(result, InvoiceTransferOutput::Processed(_)),
        "expected the status update to run, got {result:?}"
    );

    let outbound_after = invoice_row(&ctx.connection, &outbound.id);
    assert_eq!(outbound_after.status, InvoiceStatus::Delivered);
    assert_eq!(outbound_after.delivered_datetime, Some(datetime(3)));
    assert_eq!(
        outbound_after.linked_invoice_id,
        Some(inbound.id.clone()),
        "the status update must not undo the link written before it"
    );
}

/// The status update copies the inbound's status to the outbound and leaves the outbound's other
/// fields as they are now
#[actix_rt::test]
async fn status_update_keeps_outbound_changes_made_after_record_read() {
    let outbound = InvoiceRow {
        linked_invoice_id: Some("status_race_inbound".to_string()),
        ..outbound_row("status_race_outbound", InvoiceStatus::Shipped)
    };
    let inbound = InvoiceRow {
        delivered_datetime: Some(datetime(3)),
        ..inbound_row(
            "status_race_inbound",
            &outbound.id,
            InvoiceStatus::Delivered,
        )
    };
    let ctx = setup(
        "status_update_keeps_outbound_changes_made_after_record_read",
        vec![outbound.clone(), inbound.clone()],
        vec![],
    )
    .await;

    let record = read_record(&ctx.connection, &inbound.id, &outbound.id);

    update_row(
        &ctx.connection,
        InvoiceRow {
            comment: Some("edited after the record was read".to_string()),
            ..outbound.clone()
        },
    );

    UpdateOutboundInvoiceStatusProcessor
        .try_process_record(&ctx, &record)
        .unwrap();

    let outbound_after = invoice_row(&ctx.connection, &outbound.id);
    assert_eq!(outbound_after.status, InvoiceStatus::Delivered);
    assert_eq!(
        outbound_after.comment,
        Some("edited after the record was read".to_string())
    );
}

/// Updating the inbound from a shipped outbound sets the fields it copies across and leaves the
/// inbound's other fields as they are now
#[actix_rt::test]
async fn update_inbound_keeps_inbound_changes_made_after_record_read() {
    let outbound = InvoiceRow {
        linked_invoice_id: Some("update_inbound_race_inbound".to_string()),
        shipped_datetime: Some(datetime(2)),
        ..outbound_row("update_inbound_race_outbound", InvoiceStatus::Shipped)
    };
    let inbound = inbound_row(
        "update_inbound_race_inbound",
        &outbound.id,
        InvoiceStatus::Picked,
    );
    let ctx = setup(
        "update_inbound_keeps_inbound_changes_made_after_record_read",
        vec![outbound.clone(), inbound.clone()],
        vec![outbound_line(&outbound.id)],
    )
    .await;

    let record = read_record(&ctx.connection, &outbound.id, &inbound.id);

    update_row(
        &ctx.connection,
        InvoiceRow {
            colour: Some("#ff0000".to_string()),
            ..inbound.clone()
        },
    );

    UpdateInboundInvoiceProcessor
        .try_process_record(&ctx, &record)
        .unwrap();

    let inbound_after = invoice_row(&ctx.connection, &inbound.id);
    assert_eq!(inbound_after.status, InvoiceStatus::Shipped);
    assert_eq!(inbound_after.shipped_datetime, Some(datetime(2)));
    assert_eq!(inbound_after.colour, Some("#ff0000".to_string()));
}

/// Numbering an unnumbered inbound runs after the inbound update on the same record, and must not
/// put the inbound back to the Picked copy the record read
#[actix_rt::test]
async fn update_inbound_then_assign_number_on_one_record_keeps_both() {
    let outbound = InvoiceRow {
        linked_invoice_id: Some("assign_number_inbound".to_string()),
        shipped_datetime: Some(datetime(2)),
        ..outbound_row("assign_number_outbound", InvoiceStatus::Shipped)
    };
    let inbound = InvoiceRow {
        invoice_number: -1,
        ..inbound_row("assign_number_inbound", &outbound.id, InvoiceStatus::Picked)
    };
    let ctx = setup(
        "update_inbound_then_assign_number_on_one_record_keeps_both",
        vec![outbound.clone(), inbound.clone()],
        vec![outbound_line(&outbound.id)],
    )
    .await;

    let record = read_record(&ctx.connection, &outbound.id, &inbound.id);

    UpdateInboundInvoiceProcessor
        .try_process_record(&ctx, &record)
        .unwrap();
    let result = AssignInvoiceNumberProcessor
        .try_process_record(&ctx, &record)
        .unwrap();
    assert!(
        matches!(result, InvoiceTransferOutput::Processed(_)),
        "expected a number to be assigned, got {result:?}"
    );

    let inbound_after = invoice_row(&ctx.connection, &inbound.id);
    assert_ne!(inbound_after.invoice_number, -1);
    assert_eq!(
        inbound_after.status,
        InvoiceStatus::Shipped,
        "numbering must not put a shipped inbound back to Picked"
    );
    assert_eq!(inbound_after.shipped_datetime, Some(datetime(2)));
}

/// Deleting the inbound when its outbound is deleted is checked against the inbound as it is now:
/// once it has moved on from Picked it is the receiver's to work on, and isn't deleted
#[actix_rt::test]
async fn delete_skips_inbound_shipped_after_record_read() {
    let outbound = outbound_row("delete_guard_outbound", InvoiceStatus::Picked);
    let inbound = inbound_row("delete_guard_inbound", &outbound.id, InvoiceStatus::Picked);
    let ctx = setup(
        "delete_skips_inbound_shipped_after_record_read",
        vec![inbound.clone()],
        vec![],
    )
    .await;

    // The outbound has been deleted; the record holds the inbound as it was then
    let record = InvoiceTransferProcessorRecord {
        operation: Operation::Delete {
            linked_invoice: Some(invoice(&ctx.connection, &inbound.id)),
        },
        other_party_store_id: mock_store_b().id,
    };

    update_row(
        &ctx.connection,
        InvoiceRow {
            status: InvoiceStatus::Shipped,
            ..inbound.clone()
        },
    );

    let result = DeleteInboundInvoiceProcessor
        .try_process_record(&ctx, &record)
        .unwrap();
    assert!(
        matches!(
            result,
            InvoiceTransferOutput::WrongInboundStatus(InvoiceStatus::Shipped)
        ),
        "expected the delete to be skipped, got {result:?}"
    );
    assert_eq!(
        invoice_row(&ctx.connection, &inbound.id).status,
        InvoiceStatus::Shipped
    );
}
