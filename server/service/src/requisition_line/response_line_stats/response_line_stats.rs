use repository::{
    ApprovalStatusType, EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType,
    InvoiceStatus, InvoiceType, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionStatus, RequisitionType, StockLineFilter,
    StockLineRepository, StorageConnection,
};

use crate::store_preference::get_store_preferences;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct RequestStoreStats {
    pub stock_on_hand: f64,
    pub amc: f64,
    pub max_months_of_stock: f64,
    pub suggested_quantity: f64,
}

pub fn customer_store_stats(
    requisition_line: &RequisitionLine,
) -> Result<RequestStoreStats, RepositoryError> {
    Ok(RequestStoreStats {
        stock_on_hand: requisition_line
            .requisition_line_row
            .available_stock_on_hand,
        amc: requisition_line
            .requisition_line_row
            .average_monthly_consumption,
        max_months_of_stock: requisition_line.requisition_row.max_months_of_stock,
        suggested_quantity: requisition_line.requisition_line_row.suggested_quantity,
    })
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct ResponseStoreStats {
    pub stock_on_hand: f64,
    pub stock_on_order: f64, // Internal Order
    pub incoming_stock: i32, // Linked Inbound - Shipped
    pub requested_quantity: f64,
    pub other_requested_quantity: f64,
}

pub fn response_store_stats(
    connection: &StorageConnection,
    store_id: &str,
    requisition_line: &RequisitionLine,
) -> Result<ResponseStoreStats, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new()
            .item_id(EqualFilter::equal_to(
                requisition_line.item_row.id.to_string(),
            ))
            .store_id(EqualFilter::equal_to(store_id.to_string())),
        None,
    )?;

    let stock_on_hand = stock_lines.iter().fold(0.0, |sum, stock_line| {
        sum + stock_line.stock_line_row.total_number_of_packs * stock_line.stock_line_row.pack_size
    });

    let request_requisitions = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .r#type(RequisitionType::Request.equal_to())
            .item_id(EqualFilter::equal_to(
                requisition_line.item_row.id.to_string(),
            ))
            .status(RequisitionStatus::Sent.equal_to()),
    )?;

    let stock_on_order = request_requisitions
        .iter()
        .fold(0.0, |sum, requisition_line| {
            sum + requisition_line.requisition_line_row.requested_quantity
        });

    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .item_id(EqualFilter::equal_to(
                requisition_line.item_row.id.to_string(),
            ))
            .r#type(InvoiceLineType::StockIn.equal_to())
            .invoice_type(InvoiceType::InboundShipment.equal_to())
            .invoice_status(InvoiceStatus::Shipped.equal_to()),
    )?;

    let incoming_stock = invoice_lines.iter().fold(0, |sum, invoice_line| {
        sum + (invoice_line.invoice_line_row.number_of_packs
            * invoice_line.invoice_line_row.pack_size) as i32
    });

    let other_response_requisition_lines = RequisitionLineRepository::new(connection)
        .query_by_filter(
            RequisitionLineFilter::new()
                .store_id(EqualFilter::equal_to(store_id.to_string()))
                .item_id(EqualFilter::equal_to(
                    requisition_line.item_row.id.to_string(),
                ))
                .requisition_id(EqualFilter::not_equal_to(
                    requisition_line
                        .requisition_line_row
                        .requisition_id
                        .to_owned(),
                ))
                .r#type(RequisitionType::Response.equal_to())
                .status(RequisitionStatus::Finalised.not_equal_to()),
        )?;

    let prefs = get_store_preferences(connection, store_id)?;

    // For current line check prefs, then calculate the quantity based on approved status
    let calculate_line_quantity = |line: &RequisitionLine| -> f64 {
        if !prefs.response_requisition_requires_authorisation {
            line.requisition_line_row.requested_quantity
        } else {
            match line.requisition_row.approval_status {
                Some(ApprovalStatusType::Approved)
                | Some(ApprovalStatusType::ApprovedByAnother)
                | Some(ApprovalStatusType::AutoApproved) => {
                    if line.requisition_line_row.approved_quantity > 0.0 {
                        line.requisition_line_row.approved_quantity
                    } else {
                        line.requisition_line_row.requested_quantity
                    }
                }
                Some(ApprovalStatusType::Denied)
                | Some(ApprovalStatusType::DeniedByAnother)
                | Some(ApprovalStatusType::Pending) => 0.0,

                Some(ApprovalStatusType::None) | None => {
                    line.requisition_line_row.requested_quantity
                }
            }
        }
    };

    let current_line_quantity = calculate_line_quantity(requisition_line);
    let other_requested_quantity = other_response_requisition_lines
        .iter()
        .map(|line| calculate_line_quantity(line))
        .sum::<f64>()
        .max(0.0); // Normalises negative values (-0 to 0) to zero

    Ok(ResponseStoreStats {
        stock_on_hand,
        stock_on_order,
        incoming_stock,
        requested_quantity: current_line_quantity,
        other_requested_quantity,
    })
}
