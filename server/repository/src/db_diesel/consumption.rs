use super::StorageConnection;
use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter},
    DBType, DateFilter, EqualFilter, InvoiceType, RepositoryError,
};
use chrono::NaiveDate;
use diesel::{dsl::count, prelude::*};
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
        let query = create_filtered_query(filter);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        Ok(query.load::<ConsumptionRow>(self.connection.lock().connection())?)
    }

    pub fn query_items_with_consumption(
        &self,
        filter: Option<ConsumptionFilter>,
    ) -> Result<Vec<(String, i64)>, RepositoryError> {
        let query = create_filtered_query(filter);

        let query = consumption::table
            .group_by(consumption::item_id)
            .select((consumption::item_id, count(consumption::quantity)))
            .filter(consumption::item_id.eq_any(query.select(consumption::item_id)));

        Ok(query.load::<(String, i64)>(self.connection.lock().connection())?)
    }
}

type BoxedConsumptionQuery = consumption::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<ConsumptionFilter>) -> BoxedConsumptionQuery {
    let mut query = consumption::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.item_id, consumption::item_id);
        apply_equal_filter!(query, filter.store_id, consumption::store_id);
        apply_date_filter!(query, filter.date, consumption::date);
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
}
