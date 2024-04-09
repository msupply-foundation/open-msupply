use super::{
    sync_file_reference_row::{
        sync_file_reference, sync_file_reference::dsl as sync_file_reference_dsl,
    },
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    SyncFileReferenceRow,
};

use crate::{repository_error::RepositoryError, DBType, EqualFilter, Pagination, Sort};
use diesel::prelude::*;

#[derive(PartialEq, Debug, Clone)]
pub struct SyncFileReference {
    pub sync_file_reference_row: SyncFileReferenceRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct SyncFileReferenceFilter {
    pub id: Option<EqualFilter<String>>,
    pub table_name: Option<EqualFilter<String>>,
    pub record_id: Option<EqualFilter<String>>,
    pub mime_type: Option<EqualFilter<String>>,
    pub is_deleted: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum SyncFileReferenceSortField {
    CreatedDateTime,
    FileName,
}

pub type SyncFileReferenceSort = Sort<SyncFileReferenceSortField>;

pub struct SyncFileReferenceRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> SyncFileReferenceRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        SyncFileReferenceRepository { connection }
    }

    pub fn count(
        &mut self,
        filter: Option<SyncFileReferenceFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query.count().get_result(&mut self.connection.connection)?)
    }

    pub fn query_by_filter(
        &mut self,
        filter: SyncFileReferenceFilter,
    ) -> Result<Vec<SyncFileReference>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &mut self,
        pagination: Pagination,
        filter: Option<SyncFileReferenceFilter>,
        sort: Option<SyncFileReferenceSort>,
    ) -> Result<Vec<SyncFileReference>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                SyncFileReferenceSortField::CreatedDateTime => {
                    apply_sort_no_case!(query, sort, sync_file_reference_dsl::created_datetime)
                }
                SyncFileReferenceSortField::FileName => {
                    apply_sort_no_case!(query, sort, sync_file_reference_dsl::file_name)
                }
            }
        } else {
            query = query.order(sync_file_reference_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<SyncFileReferenceRow>(&mut self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(
        filter: Option<SyncFileReferenceFilter>,
    ) -> BoxedSyncFileReferenceQuery {
        let mut query = sync_file_reference::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, sync_file_reference_dsl::id);
            apply_equal_filter!(
                query,
                filter.table_name,
                sync_file_reference_dsl::table_name
            );
            apply_equal_filter!(query, filter.record_id, sync_file_reference_dsl::record_id);
            apply_equal_filter!(query, filter.mime_type, sync_file_reference_dsl::mime_type);
            if let Some(value) = filter.is_deleted {
                if value {
                    query = query.filter(sync_file_reference_dsl::deleted_datetime.is_not_null());
                } else {
                    query = query.filter(sync_file_reference_dsl::deleted_datetime.is_null());
                }
            }
        }

        query
    }
}

type BoxedSyncFileReferenceQuery = sync_file_reference::BoxedQuery<'static, DBType>;

fn to_domain(sync_file_reference_row: SyncFileReferenceRow) -> SyncFileReference {
    SyncFileReference {
        sync_file_reference_row,
    }
}

impl SyncFileReferenceFilter {
    pub fn new() -> SyncFileReferenceFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn table_name(mut self, filter: EqualFilter<String>) -> Self {
        self.table_name = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn mime_type(mut self, filter: EqualFilter<String>) -> Self {
        self.mime_type = Some(filter);
        self
    }

    pub fn is_deleted(mut self, is_deleted: bool) -> Self {
        self.is_deleted = Some(is_deleted);
        self
    }
}
