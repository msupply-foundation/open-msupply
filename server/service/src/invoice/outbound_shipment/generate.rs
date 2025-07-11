use repository::db_diesel::InvoiceLineType;
use repository::{InvoiceLineRow, InvoiceRow, ItemRowRepository, RepositoryError};
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

pub fn generate_unallocated_invoice_lines(
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
                    pack_size: 1.0,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax_percentage: None,
                    r#type: InvoiceLineType::UnallocatedStock,
                    number_of_packs: 0.0,
                    prescribed_quantity: None,
                    note: None,
                    foreign_currency_price_before_tax: None,
                    item_variant_id: None,
                    linked_invoice_id: None,
                    donor_link_id: None,
                    vvm_status_id: None,
                    reason_option_id: None,
                    campaign_id: None,
                    shipped_number_of_packs: None,
                });
            }
            Ok(None) => {}
            Err(_error) => {}
        };
    });

    Ok(result)
}
