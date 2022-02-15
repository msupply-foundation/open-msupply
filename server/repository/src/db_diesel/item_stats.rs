use crate::{
    diesel_macros::apply_equal_filter,
    schema::{
        diesel_schema::{consumption::dsl as consumption_dsl, stock_info::dsl as stock_info_dsl},
        ConsumptionRow, StockInfoRow,
    },
    RepositoryError, StorageConnection,
};
use chrono::{Duration, NaiveDateTime, Utc};
use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl};
use domain::EqualFilter;
use std::collections::HashMap;
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

#[derive(Clone, Debug, PartialEq)]
pub struct ItemStatsFilter {
    pub item_id: Option<EqualFilter<String>>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ItemStats {
    pub consumption_rows: Vec<ConsumptionRow>,
    pub stock_info_row: StockInfoRow,
    pub item_id: String,
    pub look_back_datetime: NaiveDateTime,
}

pub struct ItemStatsRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemStatsRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemStatsRepository { connection }
    }

    pub fn query(
        &self,
        store_id: &str,
        look_back_datetime: Option<NaiveDateTime>,
        filter: Option<ItemStatsFilter>,
    ) -> Result<Vec<ItemStats>, RepositoryError> {
        // Query Consumption
        let mut query = consumption_dsl::consumption.into_boxed();

        let look_back_datetime =
            look_back_datetime.unwrap_or(Utc::now().naive_utc() - Duration::days(3 * 30));

        query = query.filter(consumption_dsl::store_id.eq(store_id.clone()));
        query = query.filter(consumption_dsl::consumption_datetime.ge(look_back_datetime));

        if let Some(f) = filter.clone() {
            apply_equal_filter!(query, f.item_id, consumption_dsl::item_id);
        }

        let consumption_rows = query.load::<ConsumptionRow>(&self.connection.connection)?;

        // Query StockInfo
        let mut query = stock_info_dsl::stock_info.into_boxed();

        query = query.filter(stock_info_dsl::store_id.eq(store_id.clone()));

        if let Some(f) = filter.clone() {
            apply_equal_filter!(query, f.item_id, stock_info_dsl::item_id);
        }

        let stock_info_rows = query.load::<StockInfoRow>(&self.connection.connection)?;

        Ok(to_domain(
            look_back_datetime,
            stock_info_rows,
            consumption_rows,
        ))
    }
}

pub fn to_domain(
    look_back_datetime: NaiveDateTime,
    stock_info_rows: Vec<StockInfoRow>,
    consumption_rows: Vec<ConsumptionRow>,
) -> Vec<ItemStats> {
    let mut map: HashMap<String, ItemStats> = stock_info_rows
        .into_iter()
        .map(|stock_info_row| {
            (
                stock_info_row.item_id.clone(),
                ItemStats {
                    consumption_rows: Vec::new(),
                    item_id: stock_info_row.item_id.clone(),
                    stock_info_row,
                    look_back_datetime,
                },
            )
        })
        .collect();

    for consumption_row in consumption_rows.into_iter() {
        map.entry(consumption_row.item_id.clone())
            // Technicallly, there will always be matching record already in the HashMap
            // since stock_info view should return same item/stores as consumption view
            .or_insert(ItemStats {
                consumption_rows: Vec::new(),
                item_id: consumption_row.item_id.clone(),
                stock_info_row: StockInfoRow {
                    id: "n/a".to_owned(),
                    store_id: consumption_row.store_id.clone(),
                    item_id: consumption_row.item_id.clone(),
                    stock_on_hand: 0,
                },
                look_back_datetime,
            })
            .consumption_rows
            .push(consumption_row);
    }

    map.into_values().collect()
}

impl ItemStatsFilter {
    pub fn new() -> ItemStatsFilter {
        ItemStatsFilter { item_id: None }
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }
}

impl ItemStats {
    pub fn average_monthly_consumption(&self) -> i32 {
        let now = Utc::now().naive_utc();
        let number_of_days_since_look_back = now
            .signed_duration_since(self.look_back_datetime)
            .num_days();

        let mut total_consumption = 0;
        for row in &self.consumption_rows {
            total_consumption += row.consumption_quantity
        }

        (total_consumption as f64 / number_of_days_since_look_back as f64
            * NUMBER_OF_DAYS_IN_A_MONTH) as i32
    }

    pub fn stock_on_hand(&self) -> i32 {
        self.stock_info_row.stock_on_hand as i32
    }
}
