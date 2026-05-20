use std::convert::TryInto;

use diesel::{dsl::IntoBoxed, prelude::*};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{diesel_macros::apply_equal_filter, DBType, EqualFilter, RepositoryError};

use super::changelog::*;

// In upgrade to V7 we've change to using dynamic condition filtering
// However some plugins will still need to use this old changelog filtering
#[derive(Default, Clone, Serialize, Deserialize, Debug, TS)]
pub struct CompatibilityChangelogFilter {
    #[ts(optional)]
    pub table_name: Option<EqualFilter<ChangelogTableName>>,
    #[ts(optional)]
    pub store_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub record_id: Option<EqualFilter<String>>,
    #[ts(optional)]
    pub action: Option<EqualFilter<RowActionType>>,
    #[ts(optional)]
    pub is_sync_update: Option<EqualFilter<bool>>,
    #[ts(optional)]
    pub source_site_id: Option<EqualFilter<i32>>,
}

impl<'a> ChangelogRepository<'a> {
    pub fn compatibility_query(
        &self,
        earliest: u64,
        limit: u32,
        filter: Option<CompatibilityChangelogFilter>,
    ) -> Result<Vec<ChangelogRow>, RepositoryError> {
        let query = create_filtered_query(earliest, filter)
            .order(changelog::dsl::cursor.asc())
            .limit(limit.into());

        // // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result: Vec<ChangelogRow> = query.load(self.connection.lock().connection())?;
        Ok(result)
    }
}

type BoxedChangelogQuery = IntoBoxed<'static, changelog::table, DBType>;

fn create_base_query(earliest: u64) -> BoxedChangelogQuery {
    changelog::table
        .filter(changelog::cursor.ge(earliest.try_into().unwrap_or(0)))
        .into_boxed()
}

fn create_filtered_query(
    earliest: u64,
    filter: Option<CompatibilityChangelogFilter>,
) -> BoxedChangelogQuery {
    let mut query = create_base_query(earliest);

    if let Some(f) = filter {
        let CompatibilityChangelogFilter {
            table_name,
            store_id,
            record_id,
            is_sync_update,
            action,
            source_site_id,
        } = f;

        apply_equal_filter!(query, table_name, changelog::table_name);
        apply_equal_filter!(query, store_id, changelog::store_id);
        apply_equal_filter!(query, record_id, changelog::record_id);
        apply_equal_filter!(query, action, changelog::row_action);
        apply_equal_filter!(query, is_sync_update, changelog::is_sync_update);
        apply_equal_filter!(query, source_site_id, changelog::source_site_id);
    }

    query
}

impl CompatibilityChangelogFilter {
    pub fn new() -> Self {
        Default::default()
    }

    pub fn table_name(mut self, filter: EqualFilter<ChangelogTableName>) -> Self {
        self.table_name = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn action(mut self, filter: EqualFilter<RowActionType>) -> Self {
        self.action = Some(filter);
        self
    }

    pub fn is_sync_update(mut self, filter: EqualFilter<bool>) -> Self {
        self.is_sync_update = Some(filter);
        self
    }

    pub fn source_site_id(mut self, filter: EqualFilter<i32>) -> Self {
        self.source_site_id = Some(filter);
        self
    }
}

impl ChangelogTableName {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            not_equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

impl RowActionType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}
