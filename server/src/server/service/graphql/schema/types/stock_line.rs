use async_graphql::*;
use chrono::NaiveDate;

use crate::domain::stock_line::StockLine;

use super::{Connector, ConnectorError, NodeError};

pub struct StockLineNode {
    pub stock_line: StockLine,
}

#[Object]
impl StockLineNode {
    pub async fn id(&self) -> &str {
        &self.stock_line.id
    }
    pub async fn item_id(&self) -> &str {
        &self.stock_line.item_id
    }
    pub async fn store_id(&self) -> &str {
        &self.stock_line.store_id
    }
    pub async fn batch(&self) -> &Option<String> {
        &self.stock_line.batch
    }
    pub async fn pack_size(&self) -> i32 {
        self.stock_line.pack_size
    }
    pub async fn cost_price_per_pack(&self) -> f64 {
        self.stock_line.cost_price_per_pack
    }
    pub async fn sell_price_per_pack(&self) -> f64 {
        self.stock_line.sell_price_per_pack
    }
    pub async fn available_number_of_packs(&self) -> i32 {
        self.stock_line.available_number_of_packs
    }
    pub async fn total_number_of_packs(&self) -> i32 {
        self.stock_line.total_number_of_packs
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.stock_line.expiry_date
    }
}

type CurrentConnector = Connector<StockLineNode>;

#[derive(Union)]
pub enum StockLinesResponse {
    Error(ConnectorError),
    Response(CurrentConnector),
}

#[derive(Union)]
pub enum StockLineResponse {
    Error(NodeError),
    Response(StockLineNode),
}

impl<T, E> From<Result<T, E>> for StockLinesResponse
where
    CurrentConnector: From<T>,
    ConnectorError: From<E>,
{
    fn from(result: Result<T, E>) -> Self {
        match result {
            Ok(response) => StockLinesResponse::Response(response.into()),
            Err(error) => StockLinesResponse::Error(error.into()),
        }
    }
}

impl<T, E> From<Result<T, E>> for StockLineResponse
where
    StockLineNode: From<T>,
    NodeError: From<E>,
{
    fn from(result: Result<T, E>) -> Self {
        match result {
            Ok(response) => StockLineResponse::Response(response.into()),
            Err(error) => StockLineResponse::Error(error.into()),
        }
    }
}

impl From<StockLine> for StockLineNode {
    fn from(stock_line: StockLine) -> Self {
        StockLineNode { stock_line }
    }
}
