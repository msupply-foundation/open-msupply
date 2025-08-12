use chrono::NaiveDate;
use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
    RepositoryError, TransactionError,
};

use crate::{service_provider::ServiceContext, NullableUpdate};

mod generate;
mod test;
mod validate;

use generate::generate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum UpdateGoodsReceivedError {
    PurchaseOrderDoesNotExist,
    InboundShipmentDoesNotExist,
    GoodsReceivedDoesNotExist,
    UpdatedRecordNotFound,
    DonorDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateGoodsReceivedInput {
    pub id: String,
    pub purchase_order_id: Option<String>,
    pub inbound_shipment_id: Option<NullableUpdate<String>>,
    pub status: Option<GoodsReceivedStatus>,
    pub received_date: Option<NullableUpdate<NaiveDate>>,
    pub comment: Option<String>,
    pub supplier_reference: Option<String>,
    pub donor_link_id: Option<NullableUpdate<String>>,
}

pub fn update_goods_received(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateGoodsReceivedInput,
) -> Result<GoodsReceivedRow, UpdateGoodsReceivedError> {
    let goods_received = ctx
        .connection
        .transaction_sync(|connection| {
            let goods_received = validate(&input, &store_id, connection)?;
            let updated_goods_received = generate(goods_received, input)?;

            let goods_received_repository = GoodsReceivedRowRepository::new(connection);
            goods_received_repository.upsert_one(&updated_goods_received)?;

            goods_received_repository
                .find_one_by_id(&updated_goods_received.id)?
                .ok_or(UpdateGoodsReceivedError::UpdatedRecordNotFound)
        })
        .map_err(|error: TransactionError<UpdateGoodsReceivedError>| error.to_inner_error())?;

    Ok(goods_received)
}

impl From<RepositoryError> for UpdateGoodsReceivedError {
    fn from(error: RepositoryError) -> Self {
        UpdateGoodsReceivedError::DatabaseError(error)
    }
}
