use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType,
    InvoiceRow, InvoiceType, StorageConnection,
};
use util::uuid;

use crate::{
    invoice_line::{
        outbound_shipment_unallocated_line::{
            DeleteOutboundShipmentUnallocatedLine, InsertOutboundShipmentUnallocatedLine,
            UpdateOutboundShipmentUnallocatedLine,
        },
        stock_out_line::{
            DeleteStockOutLine, InsertStockOutLine, StockOutType, UpdateStockOutLine,
        },
    },
    NullableUpdate,
};

use super::{SaveStockOutInvoiceLine, SaveStockOutItemLines, SaveStockOutItemLinesError};

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
    invoice: InvoiceRow,
    SaveStockOutItemLines {
        invoice_id,
        item_id,
        lines,
        placeholder_quantity,
        prescribed_quantity: _,
        note: _,
    }: SaveStockOutItemLines,
) -> Result<GenerateResult, SaveStockOutItemLinesError> {
    let stock_out_type = match invoice.r#type {
        InvoiceType::OutboundShipment => StockOutType::OutboundShipment,
        InvoiceType::Prescription => StockOutType::Prescription,
        InvoiceType::CustomerReturn => StockOutType::SupplierReturn,
        InvoiceType::InventoryReduction => StockOutType::InventoryReduction,
        InvoiceType::InboundShipment => return Err(SaveStockOutItemLinesError::InvalidInvoiceType),
        InvoiceType::InventoryAddition => {
            return Err(SaveStockOutItemLinesError::InvalidInvoiceType)
        }
        InvoiceType::Repack => return Err(SaveStockOutItemLinesError::InvalidInvoiceType),
        InvoiceType::SupplierReturn => return Err(SaveStockOutItemLinesError::InvalidInvoiceType),
    };

    let existing_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .item_id(EqualFilter::equal_to(item_id.to_string()))
            .invoice_id(EqualFilter::equal_to(invoice_id.to_string())),
    )?;

    // The frontend generates ids for each line, however, if we already have a line with the same
    // stock_line_id, we need to use the existing line id instead of the new one.
    let lines = remap_ids(lines, &existing_lines);

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
            |SaveStockOutInvoiceLine {
                 id,
                 number_of_packs,
                 stock_line_id,
                 campaign_id,
                 program_id,
                 vvm_status_id,
             }| InsertStockOutLine {
                id,
                invoice_id: invoice_id.clone(),
                r#type: stock_out_type.clone(),
                stock_line_id,
                number_of_packs,
                vvm_status_id,
                campaign_id: Some(NullableUpdate { value: campaign_id }),
                program_id: Some(NullableUpdate { value: program_id }),
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
                volume_per_pack: None,
                item_variant_id: None,
                donor_id: None,
            },
        )
        .collect();

    let lines_to_update = lines
        .clone()
        .into_iter()
        .filter(|line| line.number_of_packs > 0.0 && check_already_exists(&line.id))
        .map(
            |SaveStockOutInvoiceLine {
                 id,
                 number_of_packs,
                 stock_line_id,
                 campaign_id,
                 program_id,
                 vvm_status_id,
             }| UpdateStockOutLine {
                id,
                stock_line_id: Some(stock_line_id),
                number_of_packs: Some(number_of_packs),
                r#type: Some(stock_out_type.clone()),
                campaign_id,
                program_id,
                vvm_status_id,
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
            r#type: Some(stock_out_type.clone()),
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

fn remap_ids(
    lines: Vec<SaveStockOutInvoiceLine>,
    existing_lines: &Vec<InvoiceLine>,
) -> Vec<SaveStockOutInvoiceLine> {
    lines
        .into_iter()
        .map(|line| {
            let existing_line = existing_lines.iter().find(|existing_line| {
                existing_line.invoice_line_row.stock_line_id == Some(line.stock_line_id.clone())
            });
            match existing_line {
                Some(existing_line) => SaveStockOutInvoiceLine {
                    id: existing_line.invoice_line_row.id.clone(),
                    ..line
                },
                None => line,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use repository::{InvoiceLine, InvoiceLineRow};

    use crate::invoice_line::save_stock_out_item_lines::{
        generate::remap_ids, SaveStockOutInvoiceLine,
    };

    #[test]
    fn test_remap_ids() {
        let lines = vec![
            SaveStockOutInvoiceLine {
                id: "newA".to_string(),
                number_of_packs: 1.0,
                stock_line_id: "A".to_string(),
                ..Default::default()
            },
            SaveStockOutInvoiceLine {
                id: "newB".to_string(),
                number_of_packs: 2.0,
                stock_line_id: "B".to_string(),
                ..Default::default()
            },
        ];

        let existing_lines = vec![
            InvoiceLine {
                invoice_line_row: InvoiceLineRow {
                    id: "existingA".to_string(),
                    number_of_packs: 7.0,
                    stock_line_id: Some("A".to_string()),
                    ..Default::default()
                },
                ..Default::default()
            },
            InvoiceLine {
                invoice_line_row: InvoiceLineRow {
                    id: "existingC".to_string(),
                    stock_line_id: Some("C".to_string()),
                    ..Default::default()
                },
                ..Default::default()
            },
        ];

        let result = remap_ids(lines, &existing_lines);

        assert_eq!(result[0].id, "existingA");
        assert_eq!(result[0].number_of_packs, 1.0);
        assert_eq!(result[1].id, "newB");
        assert_eq!(result[1].number_of_packs, 2.0);
    }
}
