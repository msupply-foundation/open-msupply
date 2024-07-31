use super::{replenishment::replenishment::dsl as replenishment_dsl, StorageConnection};

use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter},
    DateFilter, EqualFilter, RepositoryError,
};
use diesel::prelude::*;

table! {
    replenishment (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Double,
        date -> Date,
    }
}

use chrono::NaiveDate;
use util::Defaults;

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct ReplenishmentRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: f64,
    pub date: NaiveDate,
}

impl Default for ReplenishmentRow {
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
pub struct ReplenishmentFilter {
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub date: Option<DateFilter>,
}

pub struct ReplenishmentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReplenishmentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReplenishmentRepository { connection }
    }

    pub fn query_one(
        &self,
        filter: ReplenishmentFilter,
    ) -> Result<Option<ReplenishmentRow>, RepositoryError> {
        Ok(self.query(Some(filter))?.pop())
    }

    pub fn query(
        &self,
        filter: Option<ReplenishmentFilter>,
    ) -> Result<Vec<ReplenishmentRow>, RepositoryError> {
        // Query Replenishment
        let mut query = replenishment_dsl::replenishment.into_boxed();

        if let Some(f) = filter {
            let ReplenishmentFilter {
                item_id,
                date,
                store_id,
            } = f;

            apply_equal_filter!(query, item_id, replenishment_dsl::item_id);
            apply_equal_filter!(query, store_id, replenishment_dsl::store_id);
            apply_date_filter!(query, date, replenishment_dsl::date);
        }

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        Ok(query.load::<ReplenishmentRow>(self.connection.lock().connection())?)
    }
}

impl ReplenishmentFilter {
    pub fn new() -> ReplenishmentFilter {
        ReplenishmentFilter::default()
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
