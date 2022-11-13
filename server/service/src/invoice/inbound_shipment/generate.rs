use chrono::Utc;
use repository::db_diesel::InvoiceLineRowType;
use repository::{
    InvoiceLineRow, InvoiceRow, ItemRowRepository, LocationMovementRow, RepositoryError,
};
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

pub fn generate_empty_invoice_lines(
    ctx: &ServiceContext,
    invoice_row: &InvoiceRow,
    item_ids: Vec<String>,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let mut result: Vec<InvoiceLineRow> = Vec::new();

    item_ids.into_iter().for_each(|item_id| {
        match ItemRowRepository::new(&ctx.connection).find_one_by_id(&item_id) {
            Ok(Some(item)) => {
                result.push(InvoiceLineRow {
                    id: uuid(),
                    invoice_id: invoice_row.id.clone(),
                    item_id: item.id.clone(),
                    item_name: item.name.clone(),
                    item_code: item.code.clone(),
                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    pack_size: 1,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: None,
                    r#type: InvoiceLineRowType::StockIn,
                    number_of_packs: 0.0,
                    note: None,
                });
            }
            Ok(None) => {}
            Err(_error) => {}
        };
    });

    Ok(result)
}

pub fn generate_inbound_location_movement(
    location_id: Option<String>,
    store_id: String,
    stock_line_id: Option<String>,
) -> LocationMovementRow {
    LocationMovementRow {
        id: uuid(),
        store_id,
        stock_line_id,
        location_id,
        enter_datetime: Some(Utc::now().naive_utc()),
        exit_datetime: None,
    }
}
