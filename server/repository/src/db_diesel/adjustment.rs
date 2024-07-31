use super::{adjustment::adjustments::dsl as adjustment_dsl, StorageConnection};

use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter},
    DateFilter, EqualFilter, RepositoryError,
};
use diesel::prelude::*;

table! {
    adjustments (id) {
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
pub struct AdjustmentRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: f64,
    pub date: NaiveDate,
}

impl Default for AdjustmentRow {
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
pub struct AdjustmentFilter {
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub date: Option<DateFilter>,
}

pub struct AdjustmentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> AdjustmentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        AdjustmentRepository { connection }
    }

    pub fn query_one(
        &self,
        filter: AdjustmentFilter,
    ) -> Result<Option<AdjustmentRow>, RepositoryError> {
        Ok(self.query(Some(filter))?.pop())
    }

    pub fn query(
        &self,
        filter: Option<AdjustmentFilter>,
    ) -> Result<Vec<AdjustmentRow>, RepositoryError> {
        // Query Adjustment
        let mut query = adjustment_dsl::adjustments.into_boxed();

        if let Some(f) = filter {
            let AdjustmentFilter {
                item_id,
                date,
                store_id,
            } = f;

            apply_equal_filter!(query, item_id, adjustment_dsl::item_id);
            apply_equal_filter!(query, store_id, adjustment_dsl::store_id);
            apply_date_filter!(query, date, adjustment_dsl::date);
        }

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        Ok(query.load::<AdjustmentRow>(self.connection.lock().connection())?)
    }
}

impl AdjustmentFilter {
    pub fn new() -> AdjustmentFilter {
        AdjustmentFilter::default()
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
