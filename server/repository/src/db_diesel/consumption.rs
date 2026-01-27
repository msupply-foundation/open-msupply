use std::time::SystemTime;

use super::StorageConnection;
use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter},
    item_row::item,
    DBType, DateFilter, EqualFilter, InvoiceType, ItemFilter, ItemRepository, RepositoryError,
};
use chrono::NaiveDate;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

table! {
    consumption (id) {
        id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Double,
        date -> Date,
        invoice_type -> crate::db_diesel::invoice_row::InvoiceTypeMapping,
        name_id -> Text,
        name_properties -> Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize)]
pub struct ConsumptionRow {
    pub id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: f64,
    pub date: NaiveDate,
    pub invoice_type: InvoiceType,
    pub name_id: String,
    pub name_properties: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Default, TS, Serialize, Deserialize)]
pub struct ConsumptionFilter {
    #[ts(optional)]
    pub item_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub store_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub date: Option<DateFilter>,
    #[ts(optional)]
    pub item: Option<(/* store_id */ String, ItemFilter)>,
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
        let query = create_filtered_query(filter);

        // Debug diesel query
        // log::info!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result = query.load::<ConsumptionRow>(self.connection.lock().connection())?;

        Ok(result)
    }

    /// Get item ids with consumption > 0
    pub fn query_items_with_consumption(
        &self,
        filter: Option<ConsumptionFilter>,
    ) -> Result<Vec<String>, RepositoryError> {
        let query = create_filtered_query(filter);

        let query = query.select(consumption::item_id).distinct();

        // Debug diesel query
        // log::info!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result = query.load::<String>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedConsumptionQuery = consumption::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<ConsumptionFilter>) -> BoxedConsumptionQuery {
    let mut query = consumption::table.into_boxed();

    if let Some(f) = filter {
        let ConsumptionFilter {
            item_id,
            date,
            store_id,
            item,
        } = f;

        apply_equal_filter!(query, item_id, consumption::item_id);
        apply_equal_filter!(query, store_id, consumption::store_id);
        apply_date_filter!(query, date, consumption::date);

        if let Some((store_id, item_filter)) = item {
            let item_query = ItemRepository::create_filtered_query(store_id, Some(item_filter));
            query = query.filter(consumption::item_id.eq_any(item_query.select(item::id)));
        }
    }

    query
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

    pub fn item(mut self, filter: (/* store_id */ String, ItemFilter)) -> Self {
        self.item = Some(filter);
        self
    }
}
