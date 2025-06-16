use chrono::Utc;
use repository::{
    NameLinkRowRepository, NumberRowType, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError,
    StorageConnection,
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

    let supplier_name_link_id = NameLinkRowRepository::new(connection)
        .find_one_by_id(&input.supplier_id)?
        .map(|name_link| name_link.name_id);

    Ok(PurchaseOrderRow {
        id: input.id,
        store_id: store_id.to_string(),
        user_id: user_id.to_string(),
        supplier_name_link_id,
        purchase_order_number,
        created_datetime,
        status: PurchaseOrderStatus::New,
        ..Default::default()
    })
}
