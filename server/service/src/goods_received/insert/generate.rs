use chrono::Utc;
use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus},
    NumberRowType, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertGoodsReceivedInput;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    username: &str,
    input: InsertGoodsReceivedInput,
) -> Result<GoodsReceivedRow, RepositoryError> {
    let goods_received_number = next_number(connection, &NumberRowType::GoodsReceived, store_id)?;
    let created_datetime = Utc::now().naive_utc();

    Ok(GoodsReceivedRow {
        id: input.id,
        store_id: store_id.to_string(),
        created_by: Some(username.to_string()),
        purchase_order_id: Some(input.purchase_order_id),
        goods_received_number,
        created_datetime,
        status: GoodsReceivedStatus::New,
        ..Default::default()
    })
}
