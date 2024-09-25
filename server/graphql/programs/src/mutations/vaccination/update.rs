use async_graphql::*;

use chrono::NaiveDate;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::vaccination::VaccinationNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    vaccination::update::{UpdateVaccination, UpdateVaccinationError as ServiceError},
    NullableUpdate,
};

#[derive(InputObject)]
pub struct UpdateVaccinationInput {
    pub id: String,
    pub vaccination_date: Option<NaiveDate>,
    pub facility_name_id: Option<NullableUpdateInput<String>>,
    pub facility_free_text: Option<NullableUpdateInput<String>>,
    pub clinician_id: Option<NullableUpdateInput<String>>,
    pub comment: Option<String>,
    pub given: Option<bool>,
    pub stock_line_id: Option<String>,
    pub not_given_reason: Option<String>,
}

impl From<UpdateVaccinationInput> for UpdateVaccination {
    fn from(
        UpdateVaccinationInput {
            id,
            vaccination_date,
            clinician_id,
            comment,
            given,
            stock_line_id,
            not_given_reason,
            facility_name_id,
            facility_free_text,
        }: UpdateVaccinationInput,
    ) -> Self {
        Self {
            id,
            vaccination_date,
            clinician_id: clinician_id.map(|clinician_id| NullableUpdate {
                value: clinician_id.value,
            }),
            comment,
            given,
            stock_line_id,
            not_given_reason,
            facility_name_id: facility_name_id.map(|facility_name_id| NullableUpdate {
                value: facility_name_id.value,
            }),
            facility_free_text: facility_free_text.map(|facility_free_text| NullableUpdate {
                value: facility_free_text.value,
            }),
        }
    }
}

#[derive(Union)]
pub enum UpdateVaccinationResponse {
    Response(VaccinationNode),
}

pub fn update_vaccination(
    ctx: &Context<'_>,
    store_id: String,
    input: UpdateVaccinationInput,
) -> Result<UpdateVaccinationResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = service_provider.vaccination_service.update_vaccination(
        &service_context,
        &store_id,
        input.into(),
    );
    let result = match result {
        Ok(vaccination) => {
            UpdateVaccinationResponse::Response(VaccinationNode::from_domain(vaccination))
        }
        Err(error) => map_error(error)?,
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpdateVaccinationResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::VaccinationDoesNotExist
        | ServiceError::ClinicianDoesNotExist
        | ServiceError::FacilityNameDoesNotExist
        | ServiceError::ReasonNotProvided
        | ServiceError::StockLineNotProvided
        | ServiceError::StockLineDoesNotExist
        | ServiceError::NotMostRecentGivenDose
        | ServiceError::NotNextDose
        | ServiceError::ItemDoesNotBelongToVaccineCourse => BadUserInput(formatted_error),

        ServiceError::UpdatedRecordNotFound
        | ServiceError::InternalError(_)
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
