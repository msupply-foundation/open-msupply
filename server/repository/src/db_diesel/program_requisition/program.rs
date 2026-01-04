use super::program_row::program;
use crate::{
    db_diesel::{
        item_link_row::item_link, item_row::item, master_list_line_row::master_list_line,
        master_list_row::master_list, store_row::store,
    },
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    master_list_name_join::master_list_name_join,
    name_link,
    repository_error::RepositoryError,
    DBType, ProgramRow, StorageConnection, StringFilter,
};
use crate::{EqualFilter, Pagination, Sort};

use diesel::{dsl::IntoBoxed, prelude::*};

pub type Program = ProgramRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct ProgramFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub context_id: Option<EqualFilter<String>>,
    pub is_immunisation: Option<bool>,
    pub exists_for_store_id: Option<EqualFilter<String>>,
    pub elmis_code: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum ProgramSortField {
    Name,
}

pub type ProgramSort = Sort<ProgramSortField>;

pub struct ProgramRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRepository { connection }
    }

    pub fn count(&self, filter: Option<ProgramFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: ProgramFilter) -> Result<Vec<Program>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query_one(&self, filter: ProgramFilter) -> Result<Option<Program>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ProgramFilter>,
        sort: Option<ProgramSort>,
    ) -> Result<Vec<Program>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ProgramSortField::Name => {
                    apply_sort_no_case!(query, sort, program::name);
                }
            }
        } else {
            query = query.order(program::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<Program>(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn create_filtered_query(filter: Option<ProgramFilter>) -> BoxedUserProgramQuery {
        let mut query = program::table.into_boxed();
        query = query.filter(program::deleted_datetime.is_null());

        if let Some(f) = filter {
            let ProgramFilter {
                id,
                name,
                context_id,
                is_immunisation,
                exists_for_store_id,
                elmis_code,
                item_id,
            } = f;

            apply_equal_filter!(query, id, program::id);
            apply_string_filter!(query, name, program::name);
            apply_equal_filter!(query, context_id, program::context_id);
            apply_equal_filter!(query, elmis_code, program::elmis_code);
            if let Some(is_immunisation) = is_immunisation {
                query = query.filter(program::is_immunisation.eq(is_immunisation));
            }

            if exists_for_store_id.is_some() {
                let mut master_list_name_join_query = program::table
                    .select(program::id)
                    .distinct()
                    .left_join(
                        master_list::table.left_join(
                            master_list_name_join::table
                                .left_join(name_link::table.left_join(store::table)),
                        ),
                    )
                    .into_boxed();

                apply_equal_filter!(
                    master_list_name_join_query,
                    exists_for_store_id,
                    store::dsl::id
                );

                query = query.filter(program::id.eq_any(master_list_name_join_query));
            }

            // Note, this gets all programs/master lists including the item - not checking
            // whether the master list is visible in the store
            // Should use "exists_for_store_id" filter as well if needing this
            if item_id.is_some() {
                let mut master_list_item_query = program::table
                    .select(program::id)
                    .distinct()
                    .left_join(
                        master_list_line::table
                            .on(program::master_list_id
                                .eq(master_list_line::master_list_id.nullable()))
                            .left_join(item_link::table.left_join(item::table)),
                    )
                    .into_boxed();

                apply_equal_filter!(master_list_item_query, item_id, item::id);

                query = query.filter(program::id.eq_any(master_list_item_query));
            }
        }

        query = query.filter(program::id.ne("missing_program"));

        query
    }
}

type BoxedUserProgramQuery = IntoBoxed<'static, program::table, DBType>;

impl ProgramFilter {
    pub fn new() -> Self {
        ProgramFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn context_id(mut self, filter: EqualFilter<String>) -> Self {
        self.context_id = Some(filter);
        self
    }

    pub fn is_immunisation(mut self, filter: bool) -> Self {
        self.is_immunisation = Some(filter);
        self
    }
    pub fn elmis_code(mut self, filter: EqualFilter<String>) -> Self {
        self.elmis_code = Some(filter);
        self
    }
    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }
    pub fn exists_for_store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.exists_for_store_id = Some(filter);
        self
    }
}

#[cfg(test)]
mod tests {
    use crate::{mock::MockDataInserts, test_db, EqualFilter, ProgramFilter, ProgramRepository};

    #[actix_rt::test]
    async fn test_program_repository() {
        let (_, storage_connection, _, _) =
            test_db::setup_all("test_program_repository", MockDataInserts::all()).await;
        let program_repository = ProgramRepository::new(&storage_connection);

        let programs = program_repository
            .query_by_filter(
                ProgramFilter::new().item_id(EqualFilter::equal_to("item_query_test1".to_string())),
            )
            .unwrap();

        let program_ids: Vec<String> = programs.iter().map(|p| p.id.clone()).collect();

        // item_query_test1 is in these two programs, per "full_master_list" mock data
        assert_eq!(program_ids, vec!["program_a", "program_b"]);
    }
}
