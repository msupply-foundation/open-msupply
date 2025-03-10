use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

use crate::diesel_macros::apply_equal_filter;

use super::{
    preference_row::{preference, PreferenceRow},
    store_row::store,
    DBType, EqualFilter, Pagination, RepositoryError, StorageConnection, StoreRow,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Preference {
    pub preference_row: PreferenceRow,
    pub store_row: StoreRow,
}

#[derive(Clone, Default)]
pub struct PreferenceFilter {
    pub id: Option<EqualFilter<String>>,
}

impl PreferenceFilter {
    pub fn new() -> PreferenceFilter {
        PreferenceFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
}

pub type PreferenceJoin = (PreferenceRow, StoreRow);

pub struct PreferenceRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PreferenceRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PreferenceRepository { connection }
    }

    pub fn query_one(
        &self,
        filter: PreferenceFilter,
    ) -> Result<Option<Preference>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: PreferenceFilter,
    ) -> Result<Vec<Preference>, RepositoryError> {
        self.query(Pagination::new(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PreferenceFilter>,
    ) -> Result<Vec<Preference>, RepositoryError> {
        let query = create_filtered_query(filter);

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        //println!(
        //    "{}",
        //    diesel::debug_query::<DBType, _>(&final_query).to_string()
        //);
        let result = final_query
            .load::<PreferenceJoin>(self.connection.lock().connection())?
            .into_iter()
            .map(|(preference_row, store_row)| Preference {
                preference_row,
                store_row,
            })
            .collect();

        Ok(result)
    }
}

type BoxedPreferenceQuery = IntoBoxed<'static, InnerJoin<preference::table, store::table>, DBType>;

fn create_filtered_query(filter: Option<PreferenceFilter>) -> BoxedPreferenceQuery {
    let mut query = preference::table.inner_join(store::table).into_boxed();

    if let Some(f) = filter {
        let PreferenceFilter { id } = f;

        apply_equal_filter!(query, id, preference::id);
    }
    query
}
