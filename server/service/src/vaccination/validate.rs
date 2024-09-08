use repository::{
    vaccine_course::vaccine_course_dose_row::{
        VaccineCourseDoseRow, VaccineCourseDoseRowRepository,
    },
    EncounterRow, EncounterRowRepository, EqualFilter, ProgramEnrolment, ProgramEnrolmentFilter,
    ProgramEnrolmentRepository, RepositoryError, StorageConnection, VaccinationRow,
    VaccinationRowRepository,
};

pub fn check_vaccination_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<VaccinationRow>, RepositoryError> {
    VaccinationRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_encounter_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<EncounterRow>, RepositoryError> {
    EncounterRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_program_enrolment_exists(
    encounter: &EncounterRow,
    connection: &StorageConnection,
) -> Result<Option<ProgramEnrolment>, RepositoryError> {
    let result = ProgramEnrolmentRepository::new(connection)
        .query_by_filter(
            ProgramEnrolmentFilter::new()
                .program_id(EqualFilter::equal_to(&encounter.program_id))
                .patient_id(EqualFilter::equal_to(&encounter.patient_link_id)),
        )?
        .pop();

    Ok(result)
}

pub fn check_vaccine_course_dose_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<VaccineCourseDoseRow>, RepositoryError> {
    VaccineCourseDoseRowRepository::new(connection).find_one_by_id(id)
}
