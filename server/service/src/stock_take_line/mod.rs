use crate::service_provider::ServiceContext;

use self::delete::{delete_stock_take_line, DeleteStockTakeLineError};

pub mod delete;
pub mod validate;

#[cfg(test)]
mod tests;

pub trait StockTakeLineServiceTrait: Sync + Send {
    fn delete_stock_take_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        stock_take_line_id: &str,
    ) -> Result<String, DeleteStockTakeLineError> {
        delete_stock_take_line(ctx, store_id, stock_take_line_id)
    }
}

pub struct StockTakeLineService {}
impl StockTakeLineServiceTrait for StockTakeLineService {}
