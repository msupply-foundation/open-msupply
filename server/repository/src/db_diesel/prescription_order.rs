use super::{
    name_row::name,
    prescription_order_row::{prescription_order, PrescriptionOrderRow, PrescriptionOrderStatus},
    DBType, RepositoryError, StorageConnection,
};
use crate::diesel_macros::{
    apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter,
};
use crate::{DatetimeFilter, EqualFilter, Pagination, Sort, StringFilter};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct PrescriptionOrder {
    pub prescription_order_row: PrescriptionOrderRow,
}

#[derive(Clone, Default)]
pub struct PrescriptionOrderFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<PrescriptionOrderStatus>>,
    pub prescription_order_number: Option<EqualFilter<i64>>,
    pub patient_id: Option<EqualFilter<String>>,
    pub patient_name: Option<StringFilter>,
    pub created_datetime: Option<DatetimeFilter>,
    pub prescription_datetime: Option<DatetimeFilter>,
}

#[derive(PartialEq, Debug)]
pub enum PrescriptionOrderSortField {
    PrescriptionOrderNumber,
    CreatedDatetime,
    PrescriptionDatetime,
    Status,
}

pub type PrescriptionOrderSort = Sort<PrescriptionOrderSortField>;

pub struct PrescriptionOrderRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrescriptionOrderRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrescriptionOrderRepository { connection }
    }

    pub fn count(&self, filter: Option<PrescriptionOrderFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PrescriptionOrderFilter,
    ) -> Result<Vec<PrescriptionOrder>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: PrescriptionOrderFilter,
    ) -> Result<Option<PrescriptionOrder>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PrescriptionOrderFilter>,
        sort: Option<PrescriptionOrderSort>,
    ) -> Result<Vec<PrescriptionOrder>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                PrescriptionOrderSortField::PrescriptionOrderNumber => {
                    apply_sort!(query, sort, prescription_order::prescription_order_number)
                }
                PrescriptionOrderSortField::CreatedDatetime => {
                    apply_sort!(query, sort, prescription_order::created_datetime)
                }
                PrescriptionOrderSortField::PrescriptionDatetime => {
                    apply_sort!(query, sort, prescription_order::prescription_datetime)
                }
                PrescriptionOrderSortField::Status => {
                    apply_sort!(query, sort, prescription_order::status)
                }
            }
        } else {
            query = query.order(prescription_order::created_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PrescriptionOrderRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    fn create_filtered_query(
        filter: Option<PrescriptionOrderFilter>,
    ) -> BoxedPrescriptionOrderQuery {
        let mut query = prescription_order::table.into_boxed();

        if let Some(f) = filter {
            let PrescriptionOrderFilter {
                id,
                store_id,
                status,
                prescription_order_number,
                patient_id,
                patient_name,
                created_datetime,
                prescription_datetime,
            } = f;

            apply_equal_filter!(query, id, prescription_order::id);
            apply_equal_filter!(query, store_id, prescription_order::store_id);
            apply_equal_filter!(query, status, prescription_order::status);
            apply_equal_filter!(
                query,
                prescription_order_number,
                prescription_order::prescription_order_number
            );
            apply_equal_filter!(query, patient_id, prescription_order::patient_id);
            apply_date_time_filter!(
                query,
                created_datetime,
                prescription_order::created_datetime
            );
            apply_date_time_filter!(
                query,
                prescription_datetime,
                prescription_order::prescription_datetime
            );

            if let Some(patient_name) = patient_name {
                let mut sub_query = name::table.select(name::id).into_boxed();
                apply_string_filter!(sub_query, Some(patient_name), name::name_);
                query = query.filter(prescription_order::patient_id.eq_any(sub_query));
            }
        }

        query
    }
}

fn to_domain(prescription_order_row: PrescriptionOrderRow) -> PrescriptionOrder {
    PrescriptionOrder {
        prescription_order_row,
    }
}

type BoxedPrescriptionOrderQuery = IntoBoxed<'static, prescription_order::table, DBType>;

impl PrescriptionOrderFilter {
    pub fn new() -> PrescriptionOrderFilter {
        PrescriptionOrderFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
    pub fn status(mut self, filter: EqualFilter<PrescriptionOrderStatus>) -> Self {
        self.status = Some(filter);
        self
    }
    pub fn patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.patient_id = Some(filter);
        self
    }
}

impl PrescriptionOrderStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}
