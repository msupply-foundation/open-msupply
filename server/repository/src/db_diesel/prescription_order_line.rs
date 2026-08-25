use super::{
    prescription_order_line_row::{prescription_order_line, PrescriptionOrderLineRow},
    DBType, RepositoryError, StorageConnection,
};
use crate::diesel_macros::apply_equal_filter;
use crate::{EqualFilter, Pagination};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct PrescriptionOrderLine {
    pub prescription_order_line_row: PrescriptionOrderLineRow,
}

#[derive(Clone, Default)]
pub struct PrescriptionOrderLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub prescription_order_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
}

pub struct PrescriptionOrderLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrescriptionOrderLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrescriptionOrderLineRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<PrescriptionOrderLineFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PrescriptionOrderLineFilter,
    ) -> Result<Vec<PrescriptionOrderLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter))
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PrescriptionOrderLineFilter>,
    ) -> Result<Vec<PrescriptionOrderLine>, RepositoryError> {
        let query = Self::create_filtered_query(filter)
            // Stable order so lines don't jump around between fetches
            .order(prescription_order_line::id.asc());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PrescriptionOrderLineRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    fn create_filtered_query(
        filter: Option<PrescriptionOrderLineFilter>,
    ) -> BoxedPrescriptionOrderLineQuery {
        let mut query = prescription_order_line::table.into_boxed();

        if let Some(f) = filter {
            let PrescriptionOrderLineFilter {
                id,
                prescription_order_id,
                item_id,
            } = f;

            apply_equal_filter!(query, id, prescription_order_line::id);
            apply_equal_filter!(
                query,
                prescription_order_id,
                prescription_order_line::prescription_order_id
            );
            apply_equal_filter!(query, item_id, prescription_order_line::item_id);
        }

        query
    }
}

fn to_domain(prescription_order_line_row: PrescriptionOrderLineRow) -> PrescriptionOrderLine {
    PrescriptionOrderLine {
        prescription_order_line_row,
    }
}

type BoxedPrescriptionOrderLineQuery = IntoBoxed<'static, prescription_order_line::table, DBType>;

impl PrescriptionOrderLineFilter {
    pub fn new() -> PrescriptionOrderLineFilter {
        PrescriptionOrderLineFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn prescription_order_id(mut self, filter: EqualFilter<String>) -> Self {
        self.prescription_order_id = Some(filter);
        self
    }
}
