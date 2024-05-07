use super::{consumption::consumption::dsl as consumption_dsl, StorageConnection};

use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter},
    DateFilter, EqualFilter, RepositoryError,
};
use diesel::prelude::*;

table! {
    consumption (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> BigInt,
        date -> Date,
    }
}

use chrono::NaiveDate;
use util::Defaults;

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct ConsumptionRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: i64,
    pub date: NaiveDate,
}

impl Default for ConsumptionRow {
    fn default() -> Self {
        Self {
            date: Defaults::naive_date(),
            // Default
            id: Default::default(),
            item_id: Default::default(),
            store_id: Default::default(),
            quantity: Default::default(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct ConsumptionFilter {
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub date: Option<DateFilter>,
}

pub struct ConsumptionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ConsumptionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ConsumptionRepository { connection }
    }

    pub fn query_one(
        &self,
        filter: ConsumptionFilter,
    ) -> Result<Option<ConsumptionRow>, RepositoryError> {
        Ok(self.query(Some(filter))?.pop())
    }

    pub fn query(
        &self,
        filter: Option<ConsumptionFilter>,
    ) -> Result<Vec<ConsumptionRow>, RepositoryError> {
        // Query Consumption
        let mut query = consumption_dsl::consumption.into_boxed();

        if let Some(f) = filter {
            let ConsumptionFilter {
                item_id,
                date,
                store_id,
            } = f;

            apply_equal_filter!(query, item_id, consumption_dsl::item_id);
            apply_equal_filter!(query, store_id, consumption_dsl::store_id);
            apply_date_filter!(query, date, consumption_dsl::date);
        }

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        Ok(query.load::<ConsumptionRow>(self.connection.lock().connection())?)
    }
}

impl ConsumptionFilter {
    pub fn new() -> ConsumptionFilter {
        ConsumptionFilter::default()
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn date(mut self, filter: DateFilter) -> Self {
        self.date = Some(filter);
        self
    }
}
