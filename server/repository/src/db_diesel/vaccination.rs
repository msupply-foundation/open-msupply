use super::{
    clinician_link_row::clinician_link, clinician_row::clinician, name_link_row::name_link,
    name_row::name, vaccination_row::vaccination, DBType, RepositoryError, StorageConnection,
    VaccinationRow,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort},
    vaccine_course::vaccine_course_dose_row::{vaccine_course_dose, VaccineCourseDoseRow},
    ClinicianLinkRow, ClinicianRow, EqualFilter, NameLinkRow, NameRow, Pagination, Sort,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Vaccination {
    pub vaccination_row: VaccinationRow,
    pub vaccine_course_dose_row: VaccineCourseDoseRow,
    pub clinician_row: Option<ClinicianRow>,
    pub facility_name_row: Option<NameRow>,
}

#[derive(Clone, Default)]
pub struct VaccinationFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub program_enrolment_id: Option<EqualFilter<String>>,
    pub vaccine_course_dose_id: Option<EqualFilter<String>>,
    pub vaccine_course_id: Option<EqualFilter<String>>,
}

pub enum VaccinationSortField {
    CreatedDatetime,
}

pub type VaccinationSort = Sort<VaccinationSortField>;

pub struct VaccinationRepository<'a> {
    connection: &'a StorageConnection,
}

type VaccinationJoin = (
    VaccinationRow,
    Option<(ClinicianLinkRow, ClinicianRow)>,
    VaccineCourseDoseRow,
    Option<(NameLinkRow, NameRow)>,
);

impl<'a> VaccinationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccinationRepository { connection }
    }

    pub fn count(&self, filter: Option<VaccinationFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: VaccinationFilter,
    ) -> Result<Vec<Vaccination>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query_one(
        &self,
        filter: VaccinationFilter,
    ) -> Result<Option<Vaccination>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<VaccinationFilter>,
        sort: Option<VaccinationSort>,
    ) -> Result<Vec<Vaccination>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                VaccinationSortField::CreatedDatetime => {
                    apply_sort!(query, sort, vaccination::created_datetime);
                }
            }
        } else {
            query = query.order(vaccination::created_datetime.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<VaccinationJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(
    (vaccination_row, clinician_link_join, vaccine_course_dose_row, name_link_join): VaccinationJoin,
) -> Vaccination {
    Vaccination {
        vaccination_row,
        clinician_row: clinician_link_join.map(|(_, clinician_row)| clinician_row),
        vaccine_course_dose_row,
        facility_name_row: name_link_join.map(|(_, name_row)| name_row),
    }
}

type BoxedVaccinationQuery = IntoBoxed<
    'static,
    LeftJoin<
        InnerJoin<
            LeftJoin<vaccination::table, InnerJoin<clinician_link::table, clinician::table>>,
            vaccine_course_dose::table,
        >,
        InnerJoin<name_link::table, name::table>,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<VaccinationFilter>) -> BoxedVaccinationQuery {
    let mut query = vaccination::table
        .left_join(clinician_link::table.inner_join(clinician::table))
        .inner_join(vaccine_course_dose::table)
        .left_join(name_link::table.inner_join(name::table))
        .into_boxed();

    if let Some(f) = filter {
        let VaccinationFilter {
            id,
            store_id,
            program_enrolment_id,
            vaccine_course_dose_id,
            vaccine_course_id,
        } = f;

        apply_equal_filter!(query, id, vaccination::id);
        apply_equal_filter!(query, store_id, vaccination::store_id);
        apply_equal_filter!(
            query,
            program_enrolment_id,
            vaccination::program_enrolment_id
        );
        apply_equal_filter!(
            query,
            vaccine_course_dose_id,
            vaccination::vaccine_course_dose_id
        );

        apply_equal_filter!(
            query,
            vaccine_course_id,
            vaccine_course_dose::vaccine_course_id
        );
    }
    query
}

impl VaccinationFilter {
    pub fn new() -> VaccinationFilter {
        VaccinationFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn program_enrolment_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_enrolment_id = Some(filter);
        self
    }

    pub fn vaccine_course_dose_id(mut self, filter: EqualFilter<String>) -> Self {
        self.vaccine_course_dose_id = Some(filter);
        self
    }

    pub fn vaccine_course_id(mut self, filter: EqualFilter<String>) -> Self {
        self.vaccine_course_id = Some(filter);
        self
    }
}
