use crate::{
    diesel_macros::{apply_equal_filter, apply_simple_string_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            master_list, master_list::dsl as master_list_dsl,
            master_list_name_join::dsl as master_list_name_join_dsl, name::dsl as name_dsl,
        },
        MasterListRow,
    },
};
use domain::{
    master_list::{MasterListFilter, MasterListSort, MasterListSortField},
    EqualFilter, Pagination,
};

use super::{DBType, StorageConnection};

use diesel::prelude::*;

pub type MasterList = MasterListRow;

pub struct MasterListRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MasterListRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        MasterListRepository { connection }
    }

    pub fn count(&self, filter: Option<MasterListFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter, self.connection)?;

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: MasterListFilter,
    ) -> Result<Vec<MasterList>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<MasterListFilter>,
        sort: Option<MasterListSort>,
    ) -> Result<Vec<MasterList>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let mut query = create_filtered_query(filter, self.connection)?;

        if let Some(sort) = sort {
            match sort.key {
                MasterListSortField::Name => {
                    apply_sort_no_case!(query, sort, master_list_dsl::name);
                }
                MasterListSortField::Code => {
                    apply_sort_no_case!(query, sort, master_list_dsl::code);
                }
                MasterListSortField::Description => {
                    apply_sort_no_case!(query, sort, master_list_dsl::description);
                }
            }
        } else {
            query = query.order(master_list_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<MasterListRow>(&self.connection.connection)?;

        Ok(result)
    }
}

type BoxedMasterListQuery = master_list::BoxedQuery<'static, DBType>;

fn create_filtered_query(
    filter: Option<MasterListFilter>,
    connection: &StorageConnection,
) -> Result<BoxedMasterListQuery, RepositoryError> {
    let mut query = master_list_dsl::master_list.into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, master_list_dsl::id);
        apply_simple_string_filter!(query, f.name, master_list_dsl::name);
        apply_simple_string_filter!(query, f.code, master_list_dsl::code);
        apply_simple_string_filter!(query, f.description, master_list_dsl::description);

        // Result master list should be unique, which would need extra logic if we were to join
        // name table through master_list_name_join, thus query seperatly and use resulting
        // master_list_ids in 'any' filter
        if f.exists_for_name.is_some() || f.exists_for_name_id.is_some() {
            let mut name_join_query = master_list_name_join_dsl::master_list_name_join
                .select(master_list_name_join_dsl::master_list_id)
                .left_join(name_dsl::name)
                .into_boxed();

            apply_simple_string_filter!(name_join_query, f.exists_for_name, name_dsl::name_);
            apply_equal_filter!(name_join_query, f.exists_for_name_id, name_dsl::id);

            let master_list_ids = name_join_query.load::<String>(&connection.connection)?;

            let filter = Some(EqualFilter::equal_any(master_list_ids));
            apply_equal_filter!(query, filter, master_list_dsl::id);
        }
    }

    Ok(query)
}
