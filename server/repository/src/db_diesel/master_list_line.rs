use crate::{
    diesel_macros::apply_equal_filter,
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{master_list_line, master_list_line::dsl as master_list_line_dsl},
        MasterListLineRow,
    },
};
use domain::{master_list_line::MasterListLineFilter, Pagination};

use super::{DBType, StorageConnection};

use diesel::prelude::*;

pub type MasterListLine = MasterListLineRow;

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
        apply_equal_filter!(
            query,
            f.master_list_id,
            master_list_line_dsl::master_list_id
        );
    }

    Ok(query)
}

#[cfg(test)]
mod test {
    use domain::{master_list_line::MasterListLineFilter, EqualFilter};

    use crate::{mock::MockDataInserts, test_db, MasterListLineRepository};

    #[actix_rt::test]
    async fn test_master_list_line_repository_filter() {
        let (mock_data, connection, _, _) = test_db::setup_all(
            "test_master_list_line_repository_filter",
            MockDataInserts::all(),
        )
        .await;

        let repo = MasterListLineRepository::new(&connection);

        // Test filter by master_list_id
        let lines = repo
            .query_by_filter(
                MasterListLineFilter::new().master_list_id(EqualFilter::equal_any(vec![
                    "master_list_master_list_line_filter_test".to_string(),
                ])),
            )
            .unwrap();

        for (count, line) in mock_data
            .full_master_list
            .get("master_list_master_list_line_filter_test")
            .unwrap()
            .lines
            .iter()
            .enumerate()
        {
            assert_eq!(lines[count].id, line.id)
        }
    }
}
