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

use super::NotMostRecentGivenDose;

#[derive(InputObject)]
pub struct UpdateVaccinationInput {
    pub id: String,
    pub vaccination_date: Option<NaiveDate>,
    pub facility_name_id: Option<NullableUpdateInput<String>>,
    pub facility_free_text: Option<NullableUpdateInput<String>>,
    pub clinician_id: Option<NullableUpdateInput<String>>,
    pub comment: Option<String>,
    pub given: Option<bool>,
    pub stock_line_id: Option<NullableUpdateInput<String>>,
    pub not_given_reason: Option<String>,
    pub update_transactions: Option<bool>,
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
            update_transactions,
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
            stock_line_id: stock_line_id.map(|stock_line_id| NullableUpdate {
                value: stock_line_id.value,
            }),
            not_given_reason,
            facility_name_id: facility_name_id.map(|facility_name_id| NullableUpdate {
                value: facility_name_id.value,
            }),
            facility_free_text: facility_free_text.map(|facility_free_text| NullableUpdate {
                value: facility_free_text.value,
            }),
            update_transactions,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateVaccinationError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
pub enum UpdateVaccinationResponse {
    Response(VaccinationNode),
    Error(UpdateError),
}

#[derive(Interface)]
#[graphql(name = "UpdateVaccinationErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum UpdateErrorInterface {
    NotMostRecentGivenDose(NotMostRecentGivenDose),
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
        Err(error) => UpdateVaccinationResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::NotMostRecentGivenDose => {
            return Ok(UpdateErrorInterface::NotMostRecentGivenDose(
                NotMostRecentGivenDose,
            ))
        }
        ServiceError::VaccinationDoesNotExist
        | ServiceError::ClinicianDoesNotExist
        | ServiceError::FacilityNameDoesNotExist
        | ServiceError::ReasonNotProvided
        | ServiceError::StockLineDoesNotExist
        | ServiceError::NotNextDose
        | ServiceError::ItemDoesNotBelongToVaccineCourse => BadUserInput(formatted_error),

        ServiceError::UpdatedRecordNotFound
        | ServiceError::InternalError(_)
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
