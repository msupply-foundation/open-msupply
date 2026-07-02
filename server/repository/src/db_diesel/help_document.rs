use super::{help_document_row::help_document, DBType, HelpDocumentRow, StorageConnection};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct HelpDocument {
    pub help_document_row: HelpDocumentRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct HelpDocumentFilter {
    pub id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum HelpDocumentSortField {
    Title,
    CreatedDatetime,
}

pub type HelpDocumentSort = Sort<HelpDocumentSortField>;

pub struct HelpDocumentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> HelpDocumentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        HelpDocumentRepository { connection }
    }

    pub fn count(&self, filter: Option<HelpDocumentFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: HelpDocumentFilter,
    ) -> Result<Vec<HelpDocument>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<HelpDocumentFilter>,
        sort: Option<HelpDocumentSort>,
    ) -> Result<Vec<HelpDocument>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                HelpDocumentSortField::Title => {
                    apply_sort_no_case!(query, sort, help_document::title)
                }
                HelpDocumentSortField::CreatedDatetime => {
                    apply_sort_no_case!(query, sort, help_document::created_datetime)
                }
            }
        } else {
            query = query.order(help_document::created_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<HelpDocumentRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedHelpDocumentQuery = help_document::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<HelpDocumentFilter>) -> BoxedHelpDocumentQuery {
    let mut query = help_document::table.into_boxed();

    // Soft-deleted rows are tombstones for sync — never surface them.
    query = query.filter(help_document::deleted_datetime.is_null());

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, help_document::id);
    }

    query
}

fn to_domain(help_document_row: HelpDocumentRow) -> HelpDocument {
    HelpDocument { help_document_row }
}

impl HelpDocumentFilter {
    pub fn new() -> HelpDocumentFilter {
        HelpDocumentFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
}
