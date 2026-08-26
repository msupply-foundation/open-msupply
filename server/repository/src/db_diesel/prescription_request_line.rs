use super::{
    prescription_request_line_row::{prescription_request_line, PrescriptionRequestLineRow},
    DBType, RepositoryError, StorageConnection,
};
use crate::diesel_macros::apply_equal_filter;
use crate::{EqualFilter, Pagination};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct PrescriptionRequestLine {
    pub prescription_request_line_row: PrescriptionRequestLineRow,
}

#[derive(Clone, Default)]
pub struct PrescriptionRequestLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub prescription_request_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
}

pub struct PrescriptionRequestLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrescriptionRequestLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrescriptionRequestLineRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<PrescriptionRequestLineFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PrescriptionRequestLineFilter,
    ) -> Result<Vec<PrescriptionRequestLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PrescriptionRequestLineFilter>,
    ) -> Result<Vec<PrescriptionRequestLine>, RepositoryError> {
        let query = Self::create_filtered_query(filter)
            // Stable order so lines don't jump around between fetches
            .order(prescription_request_line::id.asc());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PrescriptionRequestLineRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    fn create_filtered_query(
        filter: Option<PrescriptionRequestLineFilter>,
    ) -> BoxedPrescriptionRequestLineQuery {
        let mut query = prescription_request_line::table.into_boxed();

        if let Some(f) = filter {
            let PrescriptionRequestLineFilter {
                id,
                prescription_request_id,
                item_id,
            } = f;

            apply_equal_filter!(query, id, prescription_request_line::id);
            apply_equal_filter!(
                query,
                prescription_request_id,
                prescription_request_line::prescription_request_id
            );
            apply_equal_filter!(query, item_id, prescription_request_line::item_id);
        }

        query
    }
}

fn to_domain(prescription_request_line_row: PrescriptionRequestLineRow) -> PrescriptionRequestLine {
    PrescriptionRequestLine {
        prescription_request_line_row,
    }
}

type BoxedPrescriptionRequestLineQuery = IntoBoxed<'static, prescription_request_line::table, DBType>;

impl PrescriptionRequestLineFilter {
    pub fn new() -> PrescriptionRequestLineFilter {
        PrescriptionRequestLineFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn prescription_request_id(mut self, filter: EqualFilter<String>) -> Self {
        self.prescription_request_id = Some(filter);
        self
    }
}
