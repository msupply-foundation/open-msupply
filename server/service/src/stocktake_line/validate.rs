use repository::{
    EqualFilter, InventoryAdjustmentReason, InventoryAdjustmentReasonFilter,
    InventoryAdjustmentReasonRepository, InventoryAdjustmentReasonType, InvoiceLineFilter,
    InvoiceLineRepository, InvoiceRowStatus, InvoiceRowType,
};
use repository::{
    ItemFilter, ItemRepository, LocationFilter, LocationRepository, RepositoryError,
    StocktakeLineRow, StocktakeLineRowRepository, StorageConnection,
};

pub fn check_stocktake_line_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeLineRow>, RepositoryError> {
    StocktakeLineRowRepository::new(&connection).find_one_by_id(id)
}

pub fn check_location_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = LocationRepository::new(connection)
        .count(Some(LocationFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 1)
}

pub fn check_item_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = ItemRepository::new(connection)
        .count(Some(ItemFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 1)
}

pub fn stocktake_reduction_amount(
    counted_number_of_packs: &Option<f64>,
    stocktake_line: &StocktakeLineRow,
) -> f64 {
    if let Some(counted_number_of_packs) = counted_number_of_packs {
        return stocktake_line.snapshot_number_of_packs - counted_number_of_packs;
    } else {
        return 0.0;
    };
}

pub fn check_active_adjustment_reasons(
    connection: &StorageConnection,
    stocktake_reduction_amount: f64,
) -> Result<Option<Vec<InventoryAdjustmentReason>>, RepositoryError> {
    let inventory_adjustment_reasons = if stocktake_reduction_amount < 0.0 {
        InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
            InventoryAdjustmentReasonFilter::new()
                .r#type(InventoryAdjustmentReasonType::Positive.equal_to())
                .is_active(true),
        )?
    } else {
        InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
            InventoryAdjustmentReasonFilter::new()
                .r#type(InventoryAdjustmentReasonType::Negative.equal_to())
                .is_active(true),
        )?
    };

    if inventory_adjustment_reasons.is_empty() {
        Ok(None)
    } else {
        Ok(Some(inventory_adjustment_reasons))
    }
}

pub fn check_reason_is_valid(
    connection: &StorageConnection,
    inventory_adjustment_reason_id: Option<String>,
    stocktake_reduction_amount: f64,
) -> Result<bool, RepositoryError> {
    if stocktake_reduction_amount < 0.0 {
        if let Some(reason_id) = &inventory_adjustment_reason_id {
            let reason = InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
                InventoryAdjustmentReasonFilter::new()
                    .r#type(InventoryAdjustmentReasonType::Positive.equal_to())
                    .is_active(true)
                    .id(EqualFilter::equal_to(&reason_id)),
            )?;
            return Ok(reason.len() == 1);
        }
    } else {
        if let Some(reason_id) = &inventory_adjustment_reason_id {
            let reason = InventoryAdjustmentReasonRepository::new(&connection).query_by_filter(
                InventoryAdjustmentReasonFilter::new()
                    .r#type(InventoryAdjustmentReasonType::Negative.equal_to())
                    .is_active(true)
                    .id(EqualFilter::equal_to(&reason_id)),
            )?;
            return Ok(reason.len() == 1);
        }
    }
    Ok(false)
}

pub fn check_stock_line_reduced_below_zero(
    connection: &StorageConnection,
    store_id: &str,
    stock_line_id: &str,
    counted_number_of_packs: &f64,
) -> Result<bool, RepositoryError> {
    let outbound_shipments = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .stock_line_id(EqualFilter::equal_to(&stock_line_id))
            .store_id(EqualFilter::equal_to(store_id))
            .invoice_status(InvoiceRowStatus::New.equal_to())
            .invoice_type(InvoiceRowType::OutboundShipment.equal_to()),
    )?;

    let total_outbound_shipment_number_of_packs: f64 = outbound_shipments
        .iter()
        .map(|line| line.invoice_line_row.number_of_packs as f64)
        .sum();

    if counted_number_of_packs - total_outbound_shipment_number_of_packs < 0.0 {
        return Ok(true);
    }
    Ok(false)
}
