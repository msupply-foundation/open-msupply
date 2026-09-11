use super::{
    clinician_link_row::{clinician_link, ClinicianLinkRow},
    clinician_row::{clinician, ClinicianRow},
    name_row::name,
    prescription_request_row::{
        prescription_request, PrescriptionRequestRow, PrescriptionRequestStatus,
    },
    user_row::user_account,
    DBType, RepositoryError, StorageConnection,
};
use crate::diesel_macros::{
    apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter,
};
use crate::dynamic_query_filter::create_condition;
use crate::{DatetimeFilter, EqualFilter, Pagination, Sort, StringFilter};
use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct PrescriptionRequest {
    pub prescription_request_row: PrescriptionRequestRow,
    /// The named clinician, resolved THROUGH `clinician_link` — the row's own
    /// `clinician_link_id` is a link id, and a merge repoints it, so it is
    /// never the clinician's id (same shape as `Invoice`/`Vaccination`).
    pub clinician_row: Option<ClinicianRow>,
}

#[derive(Clone, Default)]
pub struct PrescriptionRequestFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<PrescriptionRequestStatus>>,
    pub prescription_request_number: Option<EqualFilter<i64>>,
    pub patient_id: Option<EqualFilter<String>>,
    pub patient_name: Option<StringFilter>,
    pub created_datetime: Option<DatetimeFilter>,
    pub prescription_datetime: Option<DatetimeFilter>,
    /// When the request was dispensed — null until the hand-over's status flip
    /// sets it, so a window on this counts exactly the requests dispensed in
    /// the period (the column is nullable; the filter macro handles that).
    pub dispensed_datetime: Option<DatetimeFilter>,
    /// The prescriber — the username of the account that created the request
    /// (`created_by`), matched through a sub-select on `user_account`.
    pub username: Option<StringFilter>,
    pub dynamic_filter: Option<PrescriptionRequestCondition::Inner>,
}

// Dynamic query filter for the prescription_request table (customFields list
// filters). The condition compiles against the bare table, so it is applied
// through a sub-select on ids — the query itself is joined (`InvoiceCondition`
// does the same).
create_condition!(
    PrescriptionRequestCondition,
    prescription_request::table,
    (
        CustomField,
        custom_fields,
        prescription_request::custom_fields
    ),
);

#[derive(PartialEq, Debug)]
pub enum PrescriptionRequestSortField {
    PrescriptionRequestNumber,
    CreatedDatetime,
    PrescriptionDatetime,
    Status,
}

pub type PrescriptionRequestSort = Sort<PrescriptionRequestSortField>;

pub struct PrescriptionRequestRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PrescriptionRequestRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PrescriptionRequestRepository { connection }
    }

    pub fn count(&self, filter: Option<PrescriptionRequestFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: PrescriptionRequestFilter,
    ) -> Result<Vec<PrescriptionRequest>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: PrescriptionRequestFilter,
    ) -> Result<Option<PrescriptionRequest>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<PrescriptionRequestFilter>,
        sort: Option<PrescriptionRequestSort>,
    ) -> Result<Vec<PrescriptionRequest>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                PrescriptionRequestSortField::PrescriptionRequestNumber => {
                    apply_sort!(
                        query,
                        sort,
                        prescription_request::prescription_request_number
                    )
                }
                PrescriptionRequestSortField::CreatedDatetime => {
                    apply_sort!(query, sort, prescription_request::created_datetime)
                }
                PrescriptionRequestSortField::PrescriptionDatetime => {
                    apply_sort!(query, sort, prescription_request::prescription_datetime)
                }
                PrescriptionRequestSortField::Status => {
                    apply_sort!(query, sort, prescription_request::status)
                }
            }
        } else {
            query = query.order(prescription_request::created_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<PrescriptionRequestJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    fn create_filtered_query(
        filter: Option<PrescriptionRequestFilter>,
    ) -> BoxedPrescriptionRequestQuery {
        let mut query = query().into_boxed();

        if let Some(f) = filter {
            let PrescriptionRequestFilter {
                id,
                store_id,
                status,
                prescription_request_number,
                patient_id,
                patient_name,
                created_datetime,
                prescription_datetime,
                dispensed_datetime,
                username,
                dynamic_filter,
            } = f;

            apply_equal_filter!(query, id, prescription_request::id);
            apply_equal_filter!(query, store_id, prescription_request::store_id);
            apply_equal_filter!(query, status, prescription_request::status);
            apply_equal_filter!(
                query,
                prescription_request_number,
                prescription_request::prescription_request_number
            );
            apply_equal_filter!(query, patient_id, prescription_request::patient_id);
            apply_date_time_filter!(
                query,
                created_datetime,
                prescription_request::created_datetime
            );
            apply_date_time_filter!(
                query,
                prescription_datetime,
                prescription_request::prescription_datetime
            );
            apply_date_time_filter!(
                query,
                dispensed_datetime,
                prescription_request::dispensed_datetime
            );

            if let Some(patient_name) = patient_name {
                let mut sub_query = name::table.select(name::id).into_boxed();
                apply_string_filter!(sub_query, Some(patient_name), name::name_);
                query = query.filter(prescription_request::patient_id.eq_any(sub_query));
            }

            if let Some(username) = username {
                let mut sub_query = user_account::table.select(user_account::id).into_boxed();
                apply_string_filter!(sub_query, Some(username), user_account::username);
                query = query.filter(prescription_request::created_by.eq_any(sub_query));
            }

            if let Some(condition) = dynamic_filter {
                // The condition is built against the bare table, so it cannot
                // be applied to this joined query directly — match ids instead
                // (the InvoiceCondition pattern).
                let request_ids = prescription_request::table
                    .filter(condition.to_boxed())
                    .select(prescription_request::id)
                    .into_boxed();
                query = query.filter(prescription_request::id.eq_any(request_ids));
            }
        }

        query
    }
}

type PrescriptionRequestJoin = (
    PrescriptionRequestRow,
    Option<(ClinicianLinkRow, ClinicianRow)>,
);

fn to_domain(
    (prescription_request_row, clinician_link_join): PrescriptionRequestJoin,
) -> PrescriptionRequest {
    PrescriptionRequest {
        prescription_request_row,
        clinician_row: clinician_link_join.map(|(_, clinician_row)| clinician_row),
    }
}

#[diesel::dsl::auto_type]
fn query() -> _ {
    prescription_request::table.left_join(clinician_link::table.inner_join(clinician::table))
}

type BoxedPrescriptionRequestQuery = IntoBoxed<'static, query, DBType>;

impl PrescriptionRequestFilter {
    pub fn new() -> PrescriptionRequestFilter {
        PrescriptionRequestFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
    pub fn status(mut self, filter: EqualFilter<PrescriptionRequestStatus>) -> Self {
        self.status = Some(filter);
        self
    }
    pub fn patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.patient_id = Some(filter);
        self
    }
    pub fn dispensed_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.dispensed_datetime = Some(filter);
        self
    }
    pub fn username(mut self, filter: StringFilter) -> Self {
        self.username = Some(filter);
        self
    }
    pub fn dynamic_filter(mut self, condition: PrescriptionRequestCondition::Inner) -> Self {
        self.dynamic_filter = Some(condition);
        self
    }
}

impl PrescriptionRequestStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}
