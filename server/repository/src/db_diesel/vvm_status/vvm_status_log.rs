use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, StorageConnection,
};

use crate::{DBType, EqualFilter};

use super::vvm_status_log_row::{vvm_status_log, VVMStatusLogRow};

pub type VVMStatusLog = VVMStatusLogRow;

#[derive(Clone, Default, PartialEq, Debug)]
pub struct VVMStatusLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub stock_line_id: Option<EqualFilter<String>>,
    pub invoice_line_id: Option<EqualFilter<String>>,
}

pub struct VVMStatusLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VVMStatusLogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VVMStatusLogRepository { connection }
    }

    pub fn count(&self, filter: Option<VVMStatusLogFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: VVMStatusLogFilter,
    ) -> Result<Vec<VVMStatusLog>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<VVMStatusLogFilter>,
    ) -> Result<Vec<VVMStatusLog>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<VVMStatusLog>(self.connection.lock().connection())?;

        Ok(result)
    }
}

pub fn create_filtered_query(filter: Option<VVMStatusLogFilter>) -> BoxedVVMStatusLogQuery {
    let mut query = vvm_status_log::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, vvm_status_log::id);
        apply_equal_filter!(query, filter.stock_line_id, vvm_status_log::stock_line_id);
        apply_equal_filter!(
            query,
            filter.invoice_line_id,
            vvm_status_log::invoice_line_id
        );
    }

    query
}

type BoxedVVMStatusLogQuery = IntoBoxed<'static, vvm_status_log::table, DBType>;

impl VVMStatusLogFilter {
    pub fn new() -> VVMStatusLogFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn stock_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_line_id = Some(filter);
        self
    }

    pub fn invoice_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.invoice_line_id = Some(filter);
        self
    }
}
