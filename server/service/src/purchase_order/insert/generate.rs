use super::InsertPurchaseOrderInput;
use crate::number::next_number;
use chrono::Utc;
use repository::{
    CurrencyRowRepository, NumberRowType, PurchaseOrderRow, PurchaseOrderStatus, RepositoryError,
    StorageConnection,
};

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertPurchaseOrderInput,
    other_party_currency_id: Option<String>,
) -> Result<PurchaseOrderRow, RepositoryError> {
    let purchase_order_number = next_number(connection, &NumberRowType::PurchaseOrder, store_id)?;
    let created_datetime = Utc::now().naive_utc();
    let currency = CurrencyRowRepository::new(connection)
        .find_one_by_id(other_party_currency_id.as_deref().unwrap_or(""))?;

    Ok(PurchaseOrderRow {
        id: input.id,
        store_id: store_id.to_string(),
        created_by: Some(user_id.to_string()),
        supplier_name_link_id: input.supplier_id,
        purchase_order_number,
        created_datetime,
        status: PurchaseOrderStatus::New,
        currency_id: other_party_currency_id,
        foreign_exchange_rate: currency.map(|c| c.rate),
        ..Default::default()
    })
}
