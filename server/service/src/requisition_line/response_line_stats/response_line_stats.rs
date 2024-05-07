use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceStatus,
    InvoiceType, RepositoryError, RequisitionLine, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionStatus, RequisitionType, StockLineFilter,
    StockLineRepository, StorageConnection,
};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct RequestStoreStats {
    pub stock_on_hand: i32,
    pub amc: i32,
    pub max_months_of_stock: f64,
    pub suggested_quantity: i32,
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
    pub stock_on_order: i32, // Internal Order
    pub incoming_stock: i32, // Linked Inbound - Shipped
    pub requested_quantity: i32,
    pub other_requested_quantity: i32,
}

pub fn response_store_stats(
    connection: &StorageConnection,
    store_id: &str,
    requisition_line: &RequisitionLine,
) -> Result<ResponseStoreStats, RepositoryError> {
    let stock_lines = StockLineRepository::new(connection).query_by_filter(
        StockLineFilter::new()
            .item_id(EqualFilter::equal_to(&requisition_line.item_row.id))
            .store_id(EqualFilter::equal_to(&store_id)),
        None,
    )?;

    let stock_on_hand = stock_lines.iter().fold(0.0, |sum, stock_line| {
        sum + stock_line.stock_line_row.available_number_of_packs
            * stock_line.stock_line_row.pack_size as f64
    });

    let request_requisitions = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .r#type(RequisitionType::Request.equal_to())
            .item_id(EqualFilter::equal_to(&requisition_line.item_row.id))
            .status(RequisitionStatus::Sent.equal_to()),
    )?;

    let stock_on_order = request_requisitions
        .iter()
        .fold(0, |sum, requisition_line| {
            sum + requisition_line.requisition_line_row.requested_quantity
        });

    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .item_id(EqualFilter::equal_to(&requisition_line.item_row.id))
            .r#type(InvoiceLineType::StockIn.equal_to())
            .invoice_type(InvoiceType::InboundShipment.equal_to())
            .invoice_status(InvoiceStatus::Shipped.equal_to()),
    )?;

    let incoming_stock = invoice_lines.iter().fold(0, |sum, invoice_line| {
        sum + invoice_line.invoice_line_row.number_of_packs as i32
            * invoice_line.invoice_line_row.pack_size
    });

    let response_requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .item_id(EqualFilter::equal_to(&requisition_line.item_row.id))
            .r#type(RequisitionType::Response.equal_to())
            .status(RequisitionStatus::Finalised.not_equal_to()),
    )?;

    let other_requested_quantity = (response_requisition_lines
        .iter()
        .fold(0, |sum, requisition_line| {
            sum + requisition_line.requisition_line_row.requested_quantity
        }))
        - requisition_line.requisition_line_row.requested_quantity;

    Ok(ResponseStoreStats {
        stock_on_hand,
        stock_on_order,
        incoming_stock,
        requested_quantity: requisition_line.requisition_line_row.requested_quantity,
        other_requested_quantity,
    })
}
