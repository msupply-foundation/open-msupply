use crate::{RepositoryError, StorageConnection};

use super::consumption::ConsumptionFilter;
use diesel::prelude::*;

table! {
    days_out_of_stock (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        total_dos -> Double,

    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
pub struct DaysOutOfStockRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub total_dos: f64,
}

pub struct DaysOutOfStockRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DaysOutOfStockRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DaysOutOfStockRepository { connection }
    }

    pub fn query(
        &self,
        filter: Option<ConsumptionFilter>,
    ) -> Result<Vec<DaysOutOfStockRow>, RepositoryError> {
        // TODO: Implement query with filter
        let _ = filter;
        Ok(Vec::new())
    }
}
