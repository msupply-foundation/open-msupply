use std::collections::HashMap;

use async_graphql::*;
use repository::{InvoiceLine, ItemRow};
use service::usize_to_u32;

#[derive(Clone)]
pub struct InvoiceItemNode {
    reference_line: InvoiceLine, // at least one definitely available line for item data
    lines: Vec<InvoiceLine>,
}

#[derive(SimpleObject)]
pub struct InvoiceItemConnector {
    total_count: u32,
    nodes: Vec<InvoiceItemNode>,
}

#[Object]
impl InvoiceItemNode {
    pub async fn id(&self) -> &str {
        &self.item_row().id
    }
    pub async fn name(&self) -> &str {
        &self.item_row().name
    }

    pub async fn has_entered_quantity(&self) -> bool {
        self.lines
            .iter()
            .any(|line| line.invoice_line_row.number_of_packs > 0.0)
    }
}

impl InvoiceItemConnector {
    pub fn from_vec(invoice_lines: Vec<InvoiceLine>) -> InvoiceItemConnector {
        let mut lines_by_item_map: HashMap<String /* itemId */, InvoiceItemNode> = HashMap::new();

        for invoice_line in invoice_lines {
            let item = lines_by_item_map
                .entry(invoice_line.item_row.id.clone())
                .or_insert(InvoiceItemNode {
                    reference_line: invoice_line.clone(),
                    lines: Vec::new(),
                });

            item.lines.push(invoice_line);
        }

        InvoiceItemConnector {
            total_count: usize_to_u32(lines_by_item_map.len()),
            nodes: lines_by_item_map.values().cloned().collect(),
        }
    }
}

impl InvoiceItemNode {
    pub fn item_row(&self) -> &ItemRow {
        &self.reference_line.item_row
    }
}

// TODO TEST HER
