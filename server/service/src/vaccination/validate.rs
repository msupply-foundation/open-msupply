use repository::{
    vaccine_course::{
        vaccine_course_dose::{
            VaccineCourseDose, VaccineCourseDoseFilter, VaccineCourseDoseRepository,
        },
        vaccine_course_item::{VaccineCourseItemFilter, VaccineCourseItemRepository},
    },
    ClinicianRowRepository, EncounterRow, EncounterRowRepository, EqualFilter, ProgramEnrolment,
    ProgramEnrolmentFilter, ProgramEnrolmentRepository, RepositoryError, StorageConnection,
    Vaccination, VaccinationFilter, VaccinationRepository,
};

pub fn check_vaccination_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<Option<Vaccination>, RepositoryError> {
    let result = VaccinationRepository::new(connection)
        .query_by_filter(VaccinationFilter::new().id(EqualFilter::equal_to(id)))?
        .pop();

    Ok(result)
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
) -> Result<Option<VaccineCourseDose>, RepositoryError> {
    VaccineCourseDoseRepository::new(connection)
        .query_one(VaccineCourseDoseFilter::new().id(EqualFilter::equal_to(id)))
}

pub fn check_vaccination_does_not_exist_for_dose(
    program_enrolment_id: &str,
    vaccine_course_dose_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let vaccination = VaccinationRepository::new(connection).query_one(
        VaccinationFilter::new()
            .program_enrolment_id(EqualFilter::equal_to(program_enrolment_id))
            .vaccine_course_dose_id(EqualFilter::equal_to(vaccine_course_dose_id)),
    )?;

    Ok(vaccination.is_none())
}

pub fn check_item_belongs_to_vaccine_course(
    item_link_id: &str,
    vaccine_course_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let vaccine_course_item = VaccineCourseItemRepository::new(connection).query_one(
        VaccineCourseItemFilter::new()
            .vaccine_course_id(EqualFilter::equal_to(vaccine_course_id))
            .item_link_id(EqualFilter::equal_to(item_link_id)),
    )?;

    Ok(vaccine_course_item.is_some())
}

pub fn check_clinician_exists(
    clinician_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    let result = ClinicianRowRepository::new(connection).find_one_by_id_option(clinician_id)?;

    Ok(result.is_some())
}

pub fn get_related_vaccinations(
    connection: &StorageConnection,
    vaccine_course_id: &String,
    vaccine_course_dose_id: &String,
    program_enrolment_id: &String,
) -> Result<(Option<Vaccination>, Option<Vaccination>), RepositoryError> {
    // Get all doses based on course id
    let all_course_doses = VaccineCourseDoseRepository::new(connection).query_by_filter(
        VaccineCourseDoseFilter::new().vaccine_course_id(EqualFilter::equal_to(vaccine_course_id)),
    )?;

    // Get previous and next dose based on dose_id
    let this_dose_index = all_course_doses
        .iter()
        .position(|v| &v.vaccine_course_dose_row.id == vaccine_course_dose_id)
        .unwrap_or(0);

    let previous_dose = match this_dose_index {
        // First in course
        0 => None,
        index => all_course_doses.get(index - 1).cloned(),
    };

    let next_dose = all_course_doses.get(this_dose_index + 1).cloned();

    let previous_vaccination = if let Some(previous_dose) = previous_dose {
        let prev_vaccination = VaccinationRepository::new(connection).query_one(
            VaccinationFilter::new()
                .vaccine_course_dose_id(EqualFilter::equal_to(
                    &previous_dose.vaccine_course_dose_row.id,
                ))
                .program_enrolment_id(EqualFilter::equal_to(&program_enrolment_id)),
        )?;

        // If there is a previous dose, it should have an associated vaccination
        if prev_vaccination.is_none() {
            return Err(RepositoryError::NotFound);
        }

        prev_vaccination
    } else {
        None
    };

    let next_vaccination = VaccinationRepository::new(connection).query_one(
        VaccinationFilter::new()
            .vaccine_course_dose_id(EqualFilter::equal_to(
                &next_dose.unwrap_or_default().vaccine_course_dose_row.id,
            ))
            .program_enrolment_id(EqualFilter::equal_to(&program_enrolment_id)),
    )?;

    return Ok((previous_vaccination, next_vaccination));
}
