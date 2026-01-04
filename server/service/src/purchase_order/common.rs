use repository::{
    EqualFilter, PurchaseOrderLine, PurchaseOrderLineFilter, PurchaseOrderLineRepository,
    RepositoryError, StorageConnection,
};

pub(crate) fn get_lines_for_purchase_order(
    connection: &StorageConnection,
    purchase_order_id: &str,
) -> Result<Vec<PurchaseOrderLine>, RepositoryError> {
    let result = PurchaseOrderLineRepository::new(connection).query_by_filter(
        PurchaseOrderLineFilter::new().purchase_order_id(EqualFilter::equal_to(purchase_order_id.to_string())),
    )?;

    Ok(result)
}
