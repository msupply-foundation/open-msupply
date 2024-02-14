use std::collections::HashMap;

use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, RepositoryError,
    RequisitionLine, RequisitionLineFilter, RequisitionLineRepository, StorageConnection,
};

pub fn get_requisitions_supply_statuses(
    connection: &StorageConnection,
    requisition_ids: Vec<String>,
) -> Result<Vec<RequisitionLineSupplyStatus>, RepositoryError> {
    let existing_invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().requisition_id(EqualFilter::equal_any(requisition_ids.clone())),
    )?;

    let requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new().requisition_id(EqualFilter::equal_any(requisition_ids)),
    )?;

    let mut statuses: HashMap<RequisitionAndItemId, RequisitionLineSupplyStatus> =
        requisition_lines
            .into_iter()
            .map(|requisition_line| {
                (
                    RequisitionAndItemId {
                        requisition_id: requisition_line
                            .requisition_line_row
                            .requisition_id
                            .clone(),
                        item_id: requisition_line.item_row.id.clone(),
                    },
                    RequisitionLineSupplyStatus {
                        requisition_line,
                        invoice_lines: Vec::new(),
                    },
                )
            })
            .collect();

    for line in existing_invoice_lines {
        let requisition_id = if let Some(requisition_id) = &line.invoice_row.requisition_id {
            requisition_id
        } else {
            continue;
        };

        let status = if let Some(status) = statuses.get_mut(&RequisitionAndItemId {
            requisition_id: requisition_id.clone(),
            item_id: line.item_row.id.clone(),
        }) {
            status
        } else {
            continue;
        };

        status.invoice_lines.push(line)
    }

    Ok(statuses.into_values().collect())
}

#[derive(PartialEq, Eq, Hash)]
pub struct RequisitionAndItemId {
    pub requisition_id: String,
    pub item_id: String,
}

#[derive(Debug, Clone)]
pub struct RequisitionLineSupplyStatus {
    pub requisition_line: RequisitionLine,
    pub invoice_lines: Vec<InvoiceLine>,
}

impl RequisitionLineSupplyStatus {
    pub fn remaining_quantity(&self) -> f64 {
        let result = self.requisition_line.requisition_line_row.supply_quantity as f64
            - self.quantity_in_invoices();

        if result > 0.0 {
            result
        } else {
            0.0
        }
    }

    pub fn quantity_in_invoices(&self) -> f64 {
        self.invoice_lines.iter().fold(0.0, |sum, line| {
            sum + line.invoice_line_row.pack_size as f64 * line.invoice_line_row.number_of_packs
        })
    }

    pub fn item_id(&self) -> &str {
        &self.requisition_line.item_row.id
    }

    pub fn lines_remaining_to_supply(
        statuses: Vec<RequisitionLineSupplyStatus>,
    ) -> Vec<RequisitionLineSupplyStatus> {
        statuses
            .into_iter()
            .filter(|status| status.remaining_quantity() > 0.0)
            .collect()
    }
}
