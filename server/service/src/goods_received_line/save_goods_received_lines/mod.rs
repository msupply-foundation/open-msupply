use crate::{
    goods_received::query::get_goods_received,
    goods_received_line::{
        delete::{delete_goods_received_line, DeleteGoodsReceivedLineError},
        insert::{insert_goods_received_line, InsertGoodsReceivedLineError},
        save_goods_received_lines::generate::GenerateResult,
        update::{update_goods_received_line, UpdateGoodsReceivedLineError},
    },
    service_provider::ServiceContext,
};
use chrono::NaiveDate;
use repository::{goods_received_row::GoodsReceivedRow, RepositoryError};

pub mod generate;
use generate::generate;
pub mod validate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct SaveGoodsReceivedLinesInput {
    pub goods_received_id: String,
    pub purchase_order_line_id: String,
    pub lines: Vec<SaveGoodsReceivedLine>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct SaveGoodsReceivedLine {
    pub id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs_received: Option<f64>,
    pub received_pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub comment: Option<String>,
}

#[derive(PartialEq, Debug)]
pub enum SaveGoodsReceivedLinesError {
    GoodsReceivedDoesNotExist,
    UpdatedGoodsReceivedDoesNotExist,
    LineInsertError {
        line_id: String,
        error: InsertGoodsReceivedLineError,
    },
    LineUpdateError {
        line_id: String,
        error: UpdateGoodsReceivedLineError,
    },
    LineDeleteError {
        line_id: String,
        error: DeleteGoodsReceivedLineError,
    },
    DatabaseError(RepositoryError),
}

pub fn save_goods_received_lines(
    ctx: &ServiceContext,
    input: SaveGoodsReceivedLinesInput,
) -> Result<GoodsReceivedRow, SaveGoodsReceivedLinesError> {
    let goods_received_row = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&ctx.connection, &input.goods_received_id)?;

            let GenerateResult {
                lines_to_add,
                lines_to_update,
                lines_to_delete,
            } = generate(connection, input.clone())?;

            for line in lines_to_add {
                insert_goods_received_line(ctx, line.clone()).map_err(|error| {
                    SaveGoodsReceivedLinesError::LineInsertError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_update {
                update_goods_received_line(ctx, line.clone()).map_err(|error| {
                    SaveGoodsReceivedLinesError::LineUpdateError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line_id in lines_to_delete {
                delete_goods_received_line(ctx, line_id.clone()).map_err(|error| {
                    SaveGoodsReceivedLinesError::LineDeleteError { line_id, error }
                })?;
            }

            get_goods_received(ctx, &ctx.store_id, &input.goods_received_id)
                .map_err(SaveGoodsReceivedLinesError::DatabaseError)?
                .ok_or(SaveGoodsReceivedLinesError::UpdatedGoodsReceivedDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(goods_received_row)
}

impl From<RepositoryError> for SaveGoodsReceivedLinesError {
    fn from(error: RepositoryError) -> Self {
        SaveGoodsReceivedLinesError::DatabaseError(error)
    }
}
