use chrono::NaiveDate;
use repository::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus},
    RepositoryError, TransactionError,
};

use crate::{
    goods_received::create_goods_received_shipment::{
        create_goods_received_shipment, CreateGoodsReceivedShipment,
        CreateGoodsReceivedShipmentError,
    },
    service_provider::ServiceContext,
    NullableUpdate,
};

mod generate;
mod test;
mod validate;

use generate::generate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum UpdateGoodsReceivedError {
    GoodsReceivedDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
    ErrorCreatingShipment(CreateGoodsReceivedShipmentError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateGoodsReceivedInput {
    pub id: String,
    pub status: Option<GoodsReceivedStatus>,
    pub received_date: Option<NullableUpdate<NaiveDate>>,
    pub comment: Option<String>,
    pub donor_id: Option<NullableUpdate<String>>,
    pub supplier_reference: Option<String>,
}

pub fn update_goods_received(
    ctx: &ServiceContext,
    input: UpdateGoodsReceivedInput,
) -> Result<GoodsReceivedRow, UpdateGoodsReceivedError> {
    let goods_received = ctx
        .connection
        .transaction_sync(|connection| {
            let goods_received = validate(&input, connection)?;
            let updated_goods_received = generate(&goods_received, input)?;

            let goods_received_repository = GoodsReceivedRowRepository::new(connection);
            goods_received_repository.upsert_one(&updated_goods_received)?;

            let new_goods_received = goods_received_repository
                .find_one_by_id(&updated_goods_received.id)?
                .ok_or(UpdateGoodsReceivedError::UpdatedRecordNotFound)?;

            if goods_received.status == GoodsReceivedStatus::New
                && new_goods_received.status == GoodsReceivedStatus::Finalised
            {
                // create shipment on status change
                create_goods_received_shipment(
                    ctx,
                    CreateGoodsReceivedShipment {
                        goods_received_id: updated_goods_received.id.clone(),
                    },
                )
                .map_err(UpdateGoodsReceivedError::ErrorCreatingShipment)?;
            }

            Ok(new_goods_received)
        })
        .map_err(|error: TransactionError<UpdateGoodsReceivedError>| error.to_inner_error())?;

    Ok(goods_received)
}

impl From<RepositoryError> for UpdateGoodsReceivedError {
    fn from(error: RepositoryError) -> Self {
        UpdateGoodsReceivedError::DatabaseError(error)
    }
}
