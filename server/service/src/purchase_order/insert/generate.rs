use chrono::Utc;
use repository::{
    NumberRowType, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertPurchaseOrderInput;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertPurchaseOrderInput,
) -> Result<PurchaseOrderRow, RepositoryError> {
    let purchase_order_number = next_number(connection, &NumberRowType::PurchaseOrder, store_id)?;
    let created_datetime = Utc::now().naive_utc();

    Ok(PurchaseOrderRow {
        id: input.id,
        store_id: store_id.to_string(),
        created_by: Some(user_id.to_string()),
        supplier_name_link_id: input.supplier_id,
        purchase_order_number,
        created_datetime,
        status: PurchaseOrderStatus::New,
        ..Default::default()
    })
}
