use std::collections::HashMap;

use super::{get_connection, DBBackendConnection, DBConnection};

use crate::database::{
    repository::RepositoryError,
    schema::{diesel_schema::stock_line::dsl as stock_line_dsl, StockLineRow},
};

use actix_web::web::block;
use async_graphql::dataloader::Loader;
use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct StockLineRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl StockLineRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        StockLineRepository { pool }
    }

    pub async fn insert_one(&self, stock_line_row: &StockLineRow) -> Result<(), RepositoryError> {
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(stock_line_dsl::stock_line)
            .values(stock_line_row)
            .execute(&connection)?;
        Ok(())
    }

    pub fn find_many_by_item_ids_tx(
        connection: DBConnection,
        item_ids: Vec<String>,
    ) -> Result<Vec<StockLineRow>, RepositoryError> {
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::item_id.eq_any(item_ids))
            .load(&connection)?;
        Ok(result)
    }

    pub async fn find_one_by_id(
        &self,
        stock_line_id: &str,
    ) -> Result<StockLineRow, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        let result = stock_line_dsl::stock_line
            .filter(stock_line_dsl::id.eq(stock_line_id))
            .first(&connection)?;
        Ok(result)
    }
}

#[async_trait::async_trait]
impl Loader<String> for StockLineRepository {
    type Value = Vec<StockLineRow>;
    type Error = RepositoryError;

    async fn load(&self, item_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = get_connection(&self.pool)?;
        let item_ids: Vec<String> = item_ids.iter().map(|item_id| item_id.clone()).collect();

        // Seems like the only way to do it with diesel, I can't be sure above performance or safety implications of this
        let result =
            block(move || StockLineRepository::find_many_by_item_ids_tx(connection, item_ids))
                .await?;

        let mut result_map = HashMap::new();
        for item_row in result {
            result_map
                .entry(item_row.item_id.clone())
                .or_insert(Vec::new())
                .push(item_row);
        }
        Ok(result_map)
    }
}
