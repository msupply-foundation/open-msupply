use diesel::prelude::*;

use crate::{
    db_diesel::{
        name_link_row::name_link, name_row::name, name_tag_join::name_tag_join,
        name_tag_row::name_tag, store_row::store,
    },
    diesel_macros::apply_equal_filter,
    repository_error::RepositoryError,
    DBType, NameTagRow, StorageConnection,
};

use crate::EqualFilter;

pub type NameTag = NameTagRow;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct NameTagFilter {
    pub store_id: Option<EqualFilter<String>>,
    pub name_id: Option<EqualFilter<String>>,
}

pub struct NameTagRepository<'a> {
    connection: &'a StorageConnection,
}

pub type BoxedNameTagQuery = name_tag::BoxedQuery<'static, DBType>;

impl<'a> NameTagRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameTagRepository { connection }
    }

    pub fn query(&self, filter: Option<NameTagFilter>) -> Result<Vec<NameTag>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        let result = query.load::<NameTag>(self.connection.lock().connection())?;

        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<NameTagFilter>) -> BoxedNameTagQuery {
        let mut query = name_tag::table.into_boxed();

        let Some(NameTagFilter { store_id, name_id }) = filter else {
            return query;
        };

        if store_id.is_some() {
            let mut name_tag_query = name_tag_join::table
                .left_join(
                    name_link::table
                        .left_join(name::table)
                        .left_join(store::table),
                )
                .into_boxed();

            apply_equal_filter!(name_tag_query, store_id, store::id);
            apply_equal_filter!(name_tag_query, name_id, name::id);

            query = query
                .filter(name_tag::id.eq_any(name_tag_query.select(name_tag_join::name_tag_id)));
        }

        query
    }
}

impl NameTagFilter {
    pub fn new() -> NameTagFilter {
        Self::default()
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.name_id = Some(filter);
        self
    }
}
