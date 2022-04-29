use crate::{
    diesel_macros::apply_equal_filter,
    master_list_line_row::{master_list_line, master_list_line::dsl as master_list_line_dsl},
    repository_error::RepositoryError,
    EqualFilter, MasterListLineRow, Pagination,
};

use super::{DBType, StorageConnection};

use diesel::prelude::*;

pub type MasterListLine = MasterListLineRow;

#[derive(Clone, Debug, PartialEq)]
pub struct MasterListLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub master_list_id: Option<EqualFilter<String>>,
}

pub struct MasterListLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListLineRepository { connection }
    }

    pub fn count(&self, filter: Option<MasterListLineFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter)?;

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: MasterListLineFilter,
    ) -> Result<Vec<MasterListLine>, RepositoryError> {
        self.query(Pagination::new(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<MasterListLineFilter>,
    ) -> Result<Vec<MasterListLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = create_filtered_query(filter)?;

        query = query.order(master_list_line_dsl::id.asc());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<MasterListLineRow>(&self.connection.connection)?;

        Ok(result)
    }
}

type BoxedMasterListLineQuery = master_list_line::BoxedQuery<'static, DBType>;

fn create_filtered_query(
    filter: Option<MasterListLineFilter>,
) -> Result<BoxedMasterListLineQuery, RepositoryError> {
    let mut query = master_list_line_dsl::master_list_line.into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, master_list_line_dsl::id);
        apply_equal_filter!(query, f.item_id, master_list_line_dsl::item_id);
        apply_equal_filter!(
            query,
            f.master_list_id,
            master_list_line_dsl::master_list_id
        );
    }

    Ok(query)
}

impl MasterListLineFilter {
    pub fn new() -> MasterListLineFilter {
        MasterListLineFilter {
            id: None,
            item_id: None,
            master_list_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn master_list_id(mut self, filter: EqualFilter<String>) -> Self {
        self.master_list_id = Some(filter);
        self
    }
}
