use super::UpdateGoodsReceivedInput;
use crate::NullableUpdate;
use chrono::Utc;
use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus},
    RepositoryError,
};

pub fn generate(
    goods_received: &GoodsReceivedRow,
    UpdateGoodsReceivedInput {
        id: _,
        status,
        received_date,
        comment,
    }: UpdateGoodsReceivedInput,
) -> Result<GoodsReceivedRow, RepositoryError> {
    let mut updated_goods_received = goods_received.clone();

    if let Some(new_status) = &status {
        if *new_status == GoodsReceivedStatus::Finalised
            && goods_received.status != GoodsReceivedStatus::Finalised
        {
            updated_goods_received.finalised_datetime = Some(Utc::now().naive_utc());
        }
    }

    updated_goods_received.status = status.unwrap_or(updated_goods_received.status);
    updated_goods_received.received_date =
        nullable_update(&received_date, updated_goods_received.received_date);
    updated_goods_received.comment = comment.or(updated_goods_received.comment);

    Ok(updated_goods_received)
}

fn nullable_update<T: Clone>(input: &Option<NullableUpdate<T>>, current: Option<T>) -> Option<T> {
    match input {
        Some(NullableUpdate { value }) => value.clone(),
        None => current,
    }
}
