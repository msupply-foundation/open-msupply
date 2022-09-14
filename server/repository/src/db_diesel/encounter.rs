use super::{
    encounter_row::encounter::{self, dsl as encounter_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort},
    DBType, DatetimeFilter, EncounterRow, EncounterStatus, EqualFilter, Pagination,
    RepositoryError, Sort,
};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone)]
pub struct EncounterFilter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<String>>,
    pub patient_id: Option<EqualFilter<String>>,
    pub program: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
    pub start_datetime: Option<DatetimeFilter>,
    pub end_datetime: Option<DatetimeFilter>,
    pub status: Option<EqualFilter<EncounterStatus>>,
}

impl EncounterFilter {
    pub fn new() -> EncounterFilter {
        EncounterFilter {
            id: None,
            r#type: None,
            patient_id: None,
            program: None,
            name: None,
            start_datetime: None,
            end_datetime: None,
            status: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.patient_id = Some(filter);
        self
    }

    pub fn program(mut self, filter: EqualFilter<String>) -> Self {
        self.program = Some(filter);
        self
    }

    pub fn name(mut self, filter: EqualFilter<String>) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn start_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.start_datetime = Some(filter);
        self
    }

    pub fn end_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.end_datetime = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<EncounterStatus>) -> Self {
        self.status = Some(filter);
        self
    }
}

pub enum EncounterSortField {
    Type,
    PatientId,
    Program,
    StartDatetime,
    EndDatetime,
    Status,
}

pub type Encounter = EncounterRow;

pub type EncounterSort = Sort<EncounterSortField>;

type BoxedProgramQuery = IntoBoxed<'static, encounter::table, DBType>;

fn create_filtered_query<'a>(filter: Option<EncounterFilter>) -> BoxedProgramQuery {
    let mut query = encounter_dsl::encounter.into_boxed();

    if let Some(f) = filter {
        let EncounterFilter {
            id,
            r#type,
            patient_id,
            program,
            name,
            start_datetime,
            end_datetime,
            status,
        } = f;

        apply_equal_filter!(query, id, encounter_dsl::id);
        apply_equal_filter!(query, r#type, encounter_dsl::type_);
        apply_equal_filter!(query, patient_id, encounter_dsl::patient_id);
        apply_equal_filter!(query, program, encounter_dsl::program);
        apply_equal_filter!(query, name, encounter_dsl::name);
        apply_date_time_filter!(query, start_datetime, encounter_dsl::start_datetime);
        apply_date_time_filter!(query, end_datetime, encounter_dsl::end_datetime);
        apply_equal_filter!(query, status, encounter_dsl::status);
    }
    query
}

pub struct EncounterRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> EncounterRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        EncounterRepository { connection }
    }

    pub fn count(&self, filter: Option<EncounterFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: EncounterFilter,
    ) -> Result<Vec<Encounter>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
    ) -> Result<Vec<Encounter>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                EncounterSortField::Type => {
                    apply_sort!(query, sort, encounter_dsl::type_)
                }
                EncounterSortField::PatientId => {
                    apply_sort!(query, sort, encounter_dsl::patient_id)
                }
                EncounterSortField::Program => apply_sort!(query, sort, encounter_dsl::program),
                EncounterSortField::StartDatetime => {
                    apply_sort!(query, sort, encounter_dsl::start_datetime)
                }
                EncounterSortField::EndDatetime => {
                    apply_sort!(query, sort, encounter_dsl::end_datetime)
                }
                EncounterSortField::Status => apply_sort!(query, sort, encounter_dsl::status),
            }
        } else {
            query = query.order(encounter_dsl::patient_id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<Encounter>(&self.connection.connection)?;

        Ok(result)
    }
}
