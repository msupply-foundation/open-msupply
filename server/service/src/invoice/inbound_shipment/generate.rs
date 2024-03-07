use repository::db_diesel::InvoiceLineRowType;
use repository::{InvoiceLineRow, InvoiceRow, ItemRowRepository, RepositoryError};
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

pub fn generate_empty_invoice_lines(
    ctx: &ServiceContext,
    invoice_row: &InvoiceRow,
    item_ids: Vec<String>,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let mut result: Vec<InvoiceLineRow> = Vec::new();

    item_ids.into_iter().for_each(|item_id| {
        match ItemRowRepository::new(&ctx.connection).find_active_by_id(&item_id) {
            Ok(Some(item)) => {
                result.push(InvoiceLineRow {
                    id: uuid(),
                    invoice_id: invoice_row.id.clone(),
                    item_link_id: item.id.clone(),
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
                    inventory_adjustment_reason_id: None,
                    foreign_currency_price_before_tax: None,
                });
            }
            Ok(None) => {}
            Err(_error) => {}
        };
    });

    Ok(result)
}
