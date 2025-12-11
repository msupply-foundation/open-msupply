use chrono::NaiveDate;
use repository::{
    goods_received_line_row::{GoodsReceivedLineRow, GoodsReceivedLineRowRepository},
    EqualFilter, PurchaseOrderLineFilter, PurchaseOrderLineRepository, RepositoryError,
    TransactionError,
};
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

mod generate;
use generate::generate;
mod test;
mod validate;
use validate::{validate, validate_references};

#[derive(PartialEq, Debug)]
pub enum InsertGoodsReceivedLineError {
    GoodsReceivedDoesNotExist,
    GoodsReceivedLineAlreadyExists,
    PurchaseOrderLineDoesNotExist,
    DatabaseError(RepositoryError),
    CannotEditGoodsReceived,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertGoodsReceivedLineInput {
    pub id: String,
    pub goods_received_id: String,
    pub purchase_order_line_id: String,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs_received: Option<f64>,
    pub received_pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
    pub comment: Option<String>,
}

pub fn insert_goods_received_line(
    ctx: &ServiceContext,
    input: InsertGoodsReceivedLineInput,
) -> Result<GoodsReceivedLineRow, InsertGoodsReceivedLineError> {
    let goods_received_line = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;

            let goods_received_line = generate(connection, input.clone())?;
            GoodsReceivedLineRowRepository::new(connection).upsert_one(&goods_received_line)?;

            Ok(goods_received_line)
        })
        .map_err(|error: TransactionError<InsertGoodsReceivedLineError>| error.to_inner_error())?;

    Ok(goods_received_line)
}

impl From<RepositoryError> for InsertGoodsReceivedLineError {
    fn from(error: RepositoryError) -> Self {
        InsertGoodsReceivedLineError::DatabaseError(error)
    }
}

// Insert Goods Received Lines from Purchase Order
#[derive(PartialEq, Debug)]
pub enum InsertGoodsReceivedLinesError {
    GoodsReceivedDoesNotExist,
    PurchaseOrderNotFound,
    DatabaseError(RepositoryError),
    CannotEditGoodsReceived,
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertGoodsReceivedLinesFromPurchaseOrderInput {
    pub goods_received_id: String,
    pub purchase_order_id: String,
}

pub fn insert_goods_received_lines_from_purchase_order(
    ctx: &ServiceContext,
    input: InsertGoodsReceivedLinesFromPurchaseOrderInput,
) -> Result<Vec<GoodsReceivedLineRow>, InsertGoodsReceivedLinesError> {
    let goods_received_lines = ctx
        .connection
        .transaction_sync(|connection| {
            validate_references(&input, connection)?;

            let purchase_order_lines = PurchaseOrderLineRepository::new(connection)
                .query_by_filter(PurchaseOrderLineFilter::new().purchase_order_id(
                    EqualFilter::equal_to(input.purchase_order_id.to_string()),
                ))?;

            let mut goods_received_lines = Vec::new();

            for purchase_order_line in purchase_order_lines {
                let line_input = InsertGoodsReceivedLineInput {
                    id: uuid(),
                    goods_received_id: input.goods_received_id.clone(),
                    purchase_order_line_id: purchase_order_line.purchase_order_line_row.id.clone(),
                    batch: None,
                    expiry_date: None,
                    number_of_packs_received: None,
                    received_pack_size: None,
                    manufacturer_id: None,
                    comment: None,
                };

                let goods_received_line = generate(connection, line_input)?;
                GoodsReceivedLineRowRepository::new(connection).upsert_one(&goods_received_line)?;

                goods_received_lines.push(goods_received_line);
            }

            Ok(goods_received_lines)
        })
        .map_err(|error: TransactionError<InsertGoodsReceivedLinesError>| error.to_inner_error())?;

    Ok(goods_received_lines)
}

impl From<RepositoryError> for InsertGoodsReceivedLinesError {
    fn from(error: RepositoryError) -> Self {
        InsertGoodsReceivedLinesError::DatabaseError(error)
    }
}
