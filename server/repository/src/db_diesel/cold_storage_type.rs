use super::{
    cold_storage_type_row::cold_storage_type, ColdStorageTypeRow, DBType, StorageConnection,
};

use diesel::{dsl::not, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone, serde::Serialize)]
pub struct ColdStorageType {
    pub cold_storage_type_row: ColdStorageTypeRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct ColdStorageTypeFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum ColdStorageTypeSortField {
    Id,
    Name,
}

pub type ColdStorageTypeSort = Sort<ColdStorageTypeSortField>;

pub struct ColdStorageTypeRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ColdStorageTypeRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ColdStorageTypeRepository { connection }
    }

    pub fn count(&self, filter: Option<ColdStorageTypeFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ColdStorageTypeFilter,
    ) -> Result<Vec<ColdStorageType>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ColdStorageTypeFilter>,
        sort: Option<ColdStorageTypeSort>,
    ) -> Result<Vec<ColdStorageType>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                ColdStorageTypeSortField::Id => {
                    apply_sort_no_case!(query, sort, cold_storage_type::id)
                }
                ColdStorageTypeSortField::Name => {
                    apply_sort!(query, sort, cold_storage_type::name)
                }
            }
        } else {
            query = query.order(cold_storage_type::name.desc())
        }

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ColdStorageTypeRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(
        filter: Option<ColdStorageTypeFilter>,
    ) -> BoxedColdStorageTypeQuery {
        let mut query = cold_storage_type::table.into_boxed();
        // Any cold storage types that don't have temperature set (OdegC to 0degC default value) are invalid => filter out

        query = query.filter(not(cold_storage_type::min_temperature
            .eq(0.0)
            .and(cold_storage_type::max_temperature.eq(0.0))));

        if let Some(f) = filter {
            let ColdStorageTypeFilter { id, name } = f;

            apply_equal_filter!(query, id, cold_storage_type::id);
            apply_equal_filter!(query, name, cold_storage_type::name);
        }

        query
    }
}

type BoxedColdStorageTypeQuery = cold_storage_type::BoxedQuery<'static, DBType>;

fn to_domain(cold_storage_type_row: ColdStorageTypeRow) -> ColdStorageType {
    ColdStorageType {
        cold_storage_type_row,
    }
}

impl ColdStorageTypeFilter {
    pub fn new() -> ColdStorageTypeFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: EqualFilter<String>) -> Self {
        self.name = Some(filter);
        self
    }
}
