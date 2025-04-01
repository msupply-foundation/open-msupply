use super::{warning_row::warning, StorageConnection, WarningRow};
use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone, Default, PartialEq, Debug)]
pub struct WarningFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
}

pub type Warning = WarningRow;

pub struct WarningRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> WarningRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        WarningRepository { connection }
    }

    pub fn count(&self, filter: Option<WarningFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: WarningFilter) -> Result<Vec<Warning>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query_one(&self, filter: WarningFilter) -> Result<Option<Warning>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(&self, filter: Option<WarningFilter>) -> Result<Vec<Warning>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        query = query.order(warning::id.asc());

        let result = query.load::<Warning>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedWarningQuery = IntoBoxed<'static, warning::table, DBType>;

fn create_filtered_query(filter: Option<WarningFilter>) -> BoxedWarningQuery {
    let mut query = warning::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, warning::id);
    }

    query
}

impl WarningFilter {
    pub fn new() -> WarningFilter {
        WarningFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }
}
