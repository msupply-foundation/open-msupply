use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceRow, ItemRow, ItemRowRepository, RepositoryError,
    RequisitionLineFilter, RequisitionLineRepository, StockLineFilter, StockLineRepository,
    StorageConnection,
};

pub fn check_number_of_packs(number_of_packs_option: Option<f64>) -> bool {
    if let Some(number_of_packs) = number_of_packs_option {
        // Don't use <= 0.0 or else can't 0 out inbound shipment lines
        if number_of_packs < 0.0 {
            return false;
        }
    }
    true
}

pub fn check_item_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<ItemRow>, RepositoryError> {
    ItemRowRepository::new(connection).find_active_by_id(id)
}

pub fn check_line_row_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<InvoiceLineRow>, RepositoryError> {
    InvoiceLineRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_line_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<InvoiceLine>, RepositoryError> {
    Ok(InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().id(EqualFilter::equal_to(id)))?
        .pop())
}

pub fn check_line_belongs_to_invoice(line: &InvoiceLineRow, invoice: &InvoiceRow) -> bool {
    if line.invoice_id != invoice.id {
        return false;
    }
    true
}

pub fn check_line_not_associated_with_stocktake(
    connection: &StorageConnection,
    id: &str,
    store_id: String,
) -> bool {
    let result = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new().item_id(EqualFilter::equal_to(id)),
        Some(store_id),
    );
    match result {
        Ok(line) => line.is_empty(),
        Err(RepositoryError::NotFound) => true,
        Err(_error) => false,
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct ReductionBelowZeroError {
    pub stock_line_id: String,
    pub line_id: String,
}

pub enum CannotIssueMoreThanApprovedQuantity {
    CannotIssueMoreThanApprovedQuantity,
    RepositoryError(RepositoryError),
}

impl From<RepositoryError> for CannotIssueMoreThanApprovedQuantity {
    fn from(err: RepositoryError) -> Self {
        CannotIssueMoreThanApprovedQuantity::RepositoryError(err)
    }
}

pub fn check_item_approved_quantity(
    connection: &StorageConnection,
    item_id: &str,
    invoice_line_id: Option<String>,
    requisition_id: Option<String>,
    input_number_of_packs: Option<f64>,
    pack_size: f64,
) -> Result<(), CannotIssueMoreThanApprovedQuantity> {
    let Some(ref req_id) = requisition_id else {
        return Ok(());
    };
    let requisition_line = RequisitionLineRepository::new(connection)
        .query_by_filter(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(req_id))
                .item_id(EqualFilter::equal_to(item_id)),
        )?
        .pop();
    if let Some(requisition_line) = requisition_line {
        if requisition_line.requisition_row.program_id.is_none() {
            return Ok(());
        }

        let approved_quantity = requisition_line.requisition_line_row.approved_quantity;

        let all_lines_for_item = InvoiceLineRepository::new(connection).query_by_filter(
            InvoiceLineFilter::new()
                .requisition_id(EqualFilter::equal_to(req_id))
                .item_id(EqualFilter::equal_to(item_id)),
        )?;

        let mut total_issued_quantity: f64 = all_lines_for_item
            .iter()
            .filter(|l| {
                if let Some(ref line_id) = invoice_line_id {
                    l.invoice_line_row.id != *line_id
                } else {
                    true
                }
            })
            .map(|l| l.invoice_line_row.number_of_packs * l.invoice_line_row.pack_size)
            .sum();

        if let Some(new_num_packs) = input_number_of_packs {
            total_issued_quantity += new_num_packs * pack_size;
        }

        if total_issued_quantity > approved_quantity {
            return Err(CannotIssueMoreThanApprovedQuantity::CannotIssueMoreThanApprovedQuantity);
        }
    }

    Ok(())
}
