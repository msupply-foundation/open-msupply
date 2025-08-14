use chrono::NaiveDate;
use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineRowRepository},
    RepositoryError, TransactionError,
};

use crate::service_provider::ServiceContext;

mod generate;
mod validate;
use generate::generate;
use validate::validate;

#[derive(PartialEq, Debug)]
pub enum UpdateGoodsReceivedLineError {
    GoodsReceivedLineDoesNotExist,
    GoodsReceivedDoesNotExist,
    CannotEditGoodsReceived,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateGoodsReceivedLineInput {
    pub id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs_received: Option<f64>,
    pub received_pack_size: Option<f64>,
    pub location_id: Option<String>,
    pub manufacturer_link_id: Option<String>,
    pub comment: Option<String>,
}

impl UpdateGoodsReceivedLineInput {
    pub fn total_quantity(&self, existing_line: &GoodsReceivedLineRow) -> f64 {
        let packs = self
            .number_of_packs_received
            .unwrap_or(existing_line.number_of_packs_received);
        let pack_size = self
            .received_pack_size
            .unwrap_or(existing_line.received_pack_size);
        packs * pack_size
    }
}

pub fn update_goods_received_line(
    ctx: &ServiceContext,
    input: UpdateGoodsReceivedLineInput,
) -> Result<GoodsReceivedLineRow, UpdateGoodsReceivedLineError> {
    let goods_received_line = ctx
        .connection
        .transaction_sync(|connection| {
            let existing_line = validate(&input, connection)?;
            let updated_line = generate(existing_line, input)?;

            GoodsReceivedLineRowRepository::new(connection).upsert_one(&updated_line)?;

            Ok(updated_line)
        })
        .map_err(|error: TransactionError<UpdateGoodsReceivedLineError>| error.to_inner_error())?;

    Ok(goods_received_line)
}

impl From<RepositoryError> for UpdateGoodsReceivedLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateGoodsReceivedLineError::DatabaseError(error)
    }
}
