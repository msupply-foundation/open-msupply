use repository::{
    PurchaseOrderRow, PurchaseOrderRowRepository, RepositoryError, StorageConnection,
};

pub fn check_purchase_order_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<PurchaseOrderRow>, RepositoryError> {
    PurchaseOrderRowRepository::new(connection).find_one_by_id(id)
}
