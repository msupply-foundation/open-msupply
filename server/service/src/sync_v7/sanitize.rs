//! Null out FK fields on inbound v7 rows that reference records this site
//! doesn't (and shouldn't) have — specifically a transferred invoice_line's
//! `stock_line_id` / `location_id`, both owned by the sending site
//! (RemoteOwned) and never synced to a transfer recipient.
//!
//! Other FK targets on these rows are Central data that INTEGRATION_ORDER
//! guarantees has been integrated before the child row
use repository::{
    InvoiceLineRow, LocationRowRepository, RepositoryError, StockLineRowRepository,
    StorageConnection,
};

use crate::sync::translations::{
    is_active_record_on_site, utils::clear_invalid_fk, ActiveRecordCheck,
};

const INVOICE_LINE: &str = "invoice_line";
const STOCK_LINE_ID: &str = "stock_line_id";
const LOCATION_ID: &str = "location_id";

pub(crate) fn sanitize_invoice_line(
    connection: &StorageConnection,
    row: &mut InvoiceLineRow,
) -> Result<(), RepositoryError> {
    // Only log a missing stock_line/location on records owned by this site —
    // for transferred records they are expected to be missing and not
    // operator-actionable.
    let log_cross_site_fk = is_active_record_on_site(
        connection,
        ActiveRecordCheck::InvoiceLine {
            invoice_id: row.invoice_id.clone(),
        },
    )
    .unwrap_or(false);

    row.stock_line_id = clear_invalid_fk(
        connection,
        INVOICE_LINE,
        &row.id,
        STOCK_LINE_ID,
        row.stock_line_id.take(),
        |c, id| StockLineRowRepository::new(c).check_exists_by_id(id),
        log_cross_site_fk,
    )?;
    row.location_id = clear_invalid_fk(
        connection,
        INVOICE_LINE,
        &row.id,
        LOCATION_ID,
        row.location_id.take(),
        |c, id| LocationRowRepository::new(c).check_exists_by_id(id),
        log_cross_site_fk,
    )?;

    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::{
        mock::{mock_outbound_shipment_a, MockDataInserts},
        test_db::setup_all,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType,
    };

    /// An invoice_line arriving via transfer references
    /// a stock_line / location that only exist on the sending site. Without
    /// sanitisation the row fails the FK on insert; with sanitisation the FKs
    /// are nulled and the row integrates.
    #[actix_rt::test]
    async fn sanitize_invoice_line_nulls_stock_line_id_and_location_id() {
        let (_, connection, _, _) = setup_all(
            "sanitize_invoice_line_nulls_unknown_stock_line_id",
            MockDataInserts::none().stores().units().items().invoices(),
        )
        .await;

        // Mimic an outbound invoice_line synced from another site: stock_line_id
        // and location_id reference records that don't exist locally.
        let mut row = InvoiceLineRow {
            id: "sanitize_test_line".to_string(),
            invoice_id: mock_outbound_shipment_a().id,
            item_link_id: "item_a".to_string(),
            item_name: "Item A".to_string(),
            item_code: "item_a".to_string(),
            stock_line_id: Some("does_not_exist_on_this_site".to_string()),
            location_id: Some("location_does_not_exist_on_this_site".to_string()),
            pack_size: 1.0,
            number_of_packs: 1.0,
            r#type: InvoiceLineType::StockOut,
            ..Default::default()
        };

        sanitize_invoice_line(&connection, &mut row).unwrap();
        assert_eq!(row.stock_line_id, None);
        assert_eq!(row.location_id, None);

        // And the row now upserts cleanly (would previously have failed the FK).
        InvoiceLineRowRepository::new(&connection)
            .upsert_one(&row)
            .unwrap();
    }
}
