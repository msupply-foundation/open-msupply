use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, RepositoryError,
    StorageConnection,
};
use util::uuid;

use crate::invoice_line::{
    outbound_shipment_unallocated_line::{
        DeleteOutboundShipmentUnallocatedLine, InsertOutboundShipmentUnallocatedLine,
        UpdateOutboundShipmentUnallocatedLine,
    },
    stock_out_line::{DeleteStockOutLine, InsertStockOutLine, StockOutType, UpdateStockOutLine},
};

use super::{SaveOutboundShipmentItemLines, SaveOutboundShipmentLine};

pub enum ManagePlaceholderLine {
    Insert(InsertOutboundShipmentUnallocatedLine),
    Update(UpdateOutboundShipmentUnallocatedLine),
    Delete(DeleteOutboundShipmentUnallocatedLine),
    NothingToDo,
}
pub struct GenerateResult {
    pub lines_to_add: Vec<InsertStockOutLine>,
    pub lines_to_update: Vec<UpdateStockOutLine>,
    pub lines_to_delete: Vec<DeleteStockOutLine>,
    pub manage_placeholder: ManagePlaceholderLine,
}

pub fn generate(
    connection: &StorageConnection,
    SaveOutboundShipmentItemLines {
        invoice_id,
        item_id,
        lines,
        placeholder_quantity,
    }: SaveOutboundShipmentItemLines,
) -> Result<GenerateResult, RepositoryError> {
    let existing_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .item_id(EqualFilter::equal_to(&item_id))
            .invoice_id(EqualFilter::equal_to(&invoice_id)),
    )?;

    let check_already_exists = |id: &str| {
        existing_lines
            .iter()
            .any(|line| line.invoice_line_row.id == id)
    };

    let lines_to_add = lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0 && !check_already_exists(&line.id))
        .map(
            |SaveOutboundShipmentLine {
                 id,
                 number_of_packs,
                 stock_line_id,
             }| InsertStockOutLine {
                id,
                invoice_id: invoice_id.clone(),
                r#type: StockOutType::OutboundShipment,
                stock_line_id,
                number_of_packs,
                // Default (use None so the stock line values are used)
                batch: None,
                pack_size: None,
                expiry_date: None,
                prescribed_quantity: None,
                total_before_tax: None,
                tax_percentage: None,
                note: None,
                location_id: None,
                cost_price_per_pack: None,
                sell_price_per_pack: None,
            },
        )
        .collect();

    let lines_to_update = lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0 && check_already_exists(&line.id))
        .map(
            |SaveOutboundShipmentLine {
                 id,
                 number_of_packs,
                 stock_line_id,
             }| UpdateStockOutLine {
                id,
                stock_line_id: Some(stock_line_id),
                number_of_packs: Some(number_of_packs),
                r#type: Some(StockOutType::OutboundShipment),
                // Default
                prescribed_quantity: None,
                total_before_tax: None,
                tax: None,
                note: None,
            },
        )
        .collect();

    let lines_to_delete = lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs <= 0.0 && check_already_exists(&line.id))
        .map(|line| DeleteStockOutLine {
            id: line.id,
            r#type: Some(StockOutType::OutboundShipment),
        })
        .collect();

    let existing_placeholder = existing_lines
        .iter()
        .find(|line| line.invoice_line_row.r#type == InvoiceLineType::UnallocatedStock);

    let manage_placeholder = match (existing_placeholder, placeholder_quantity) {
        (Some(line), Some(quantity)) => {
            if quantity > 0.0 {
                ManagePlaceholderLine::Update(UpdateOutboundShipmentUnallocatedLine {
                    id: line.invoice_line_row.id.clone(),
                    quantity,
                })
            } else {
                ManagePlaceholderLine::Delete(DeleteOutboundShipmentUnallocatedLine {
                    id: line.invoice_line_row.id.clone(),
                })
            }
        }
        (Some(line), None) => {
            ManagePlaceholderLine::Delete(DeleteOutboundShipmentUnallocatedLine {
                id: line.invoice_line_row.id.clone(),
            })
        }
        (None, Some(quantity)) if quantity > 0.0 => {
            ManagePlaceholderLine::Insert(InsertOutboundShipmentUnallocatedLine {
                id: uuid::uuid(),
                invoice_id,
                item_id,
                quantity: quantity as u32, // worth cleaning up this input... gets saved as f64?
            })
        }
        _ => ManagePlaceholderLine::NothingToDo,
    };

    Ok(GenerateResult {
        lines_to_add,
        lines_to_update,
        lines_to_delete,
        manage_placeholder,
    })
}
