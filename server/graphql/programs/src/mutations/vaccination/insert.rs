use async_graphql::*;

use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::vaccination::VaccinationNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    vaccination::insert::{InsertVaccination, InsertVaccinationError as ServiceError},
};

#[derive(InputObject)]
pub struct InsertVaccinationInput {
    pub id: String,
    pub encounter_id: String,
    pub vaccine_course_dose_id: String,
    pub vaccination_date: Option<NaiveDate>,
    pub clinician_id: Option<String>,
    pub facility_name_id: Option<String>,
    pub facility_free_text: Option<String>,
    pub comment: Option<String>,
    pub given: bool,
    pub stock_line_id: Option<String>,
    pub not_given_reason: Option<String>,
}

impl From<InsertVaccinationInput> for InsertVaccination {
    fn from(
        InsertVaccinationInput {
            id,
            encounter_id,
            vaccine_course_dose_id,
            vaccination_date,
            clinician_id,
            facility_name_id,
            facility_free_text,
            comment,
            given,
            stock_line_id,
            not_given_reason,
        }: InsertVaccinationInput,
    ) -> Self {
        Self {
            id,
            encounter_id,
            vaccine_course_dose_id,
            vaccination_date,
            clinician_id,
            facility_name_id,
            facility_free_text,
            comment,
            given,
            stock_line_id,
            not_given_reason,
        }
    }
}

#[derive(Union)]
pub enum InsertVaccinationResponse {
    Response(VaccinationNode),
}

pub fn insert_vaccination(
    ctx: &Context<'_>,
    store_id: String,
    input: InsertVaccinationInput,
) -> Result<InsertVaccinationResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = service_provider.vaccination_service.insert_vaccination(
        &service_context,
        &store_id,
        input.into(),
    );
    let result = match result {
        Ok(vaccination) => {
            InsertVaccinationResponse::Response(VaccinationNode::from_domain(vaccination))
        }
        Err(error) => map_error(error)?,
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertVaccinationResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::VaccinationAlreadyExists
        | ServiceError::ClinicianDoesNotExist
        | ServiceError::FacilityNameDoesNotExist
        | ServiceError::EncounterDoesNotExist
        | ServiceError::VaccineCourseDoseDoesNotExist
        | ServiceError::ProgramEnrolmentDoesNotMatchVaccineCourse
        | ServiceError::VaccinationAlreadyExistsForDose
        | ServiceError::ReasonNotProvided
        | ServiceError::StockLineNotProvided
        | ServiceError::StockLineDoesNotExist
        | ServiceError::ItemDoesNotBelongToVaccineCourse => BadUserInput(formatted_error),

        ServiceError::CreatedRecordNotFound
        | ServiceError::ProgramEnrolmentDoesNotExist
        | ServiceError::InternalError(_)
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
