use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

use crate::diesel_macros::apply_equal_filter;

use super::{
    name_link_row::name_link,
    name_row::{name, NameRow},
    preference_row::{preference, PreferenceRow},
    store_row::{store, StoreRow},
    DBType, EqualFilter, NameLinkRow, Pagination, RepositoryError, StorageConnection,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Preference {
    pub preference_row: PreferenceRow,
    pub name_row: Option<NameRow>,
}

pub type PreferenceJoin = (PreferenceRow, Option<(StoreRow, (NameLinkRow, NameRow))>);

#[derive(Clone, Default)]
pub struct PreferenceFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub key: Option<EqualFilter<String>>,
}

impl PreferenceFilter {
    pub fn new() -> PreferenceFilter {
        PreferenceFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn key(mut self, filter: EqualFilter<String>) -> Self {
        self.key = Some(filter);
        self
    }
}

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
            .map(|(preference_row, store)| Preference {
                preference_row,
                name_row: store.map(|(_, (_, name_row))| name_row),
            })
            .collect();

        Ok(result)
    }
}

type BoxedPreferenceQuery = IntoBoxed<
    'static,
    LeftJoin<preference::table, InnerJoin<store::table, InnerJoin<name_link::table, name::table>>>,
    DBType,
>;

fn create_filtered_query(filter: Option<PreferenceFilter>) -> BoxedPreferenceQuery {
    let mut query = preference::table
        .left_join(store::table.inner_join(name_link::table.inner_join(name::table)))
        .into_boxed();

    if let Some(f) = filter {
        let PreferenceFilter { id, store_id, key } = f;

        apply_equal_filter!(query, id, preference::id);
        apply_equal_filter!(query, store_id, preference::store_id);
        apply_equal_filter!(query, key, preference::key);
    }
    query
}
