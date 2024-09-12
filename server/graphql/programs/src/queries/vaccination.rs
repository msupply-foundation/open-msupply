use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{ErrorWrapper, NodeError, NodeErrorInterface, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{vaccination::VaccinationNode, vaccination_card::VaccinationCardNode};
use repository::RepositoryError;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum VaccinationCardResponse {
    Response(VaccinationCardNode),
    Error(NodeError),
}

pub fn vaccination_card(
    ctx: &Context<'_>,
    store_id: String,
    program_enrolment_id: String,
) -> Result<VaccinationCardResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    match service_provider
        .vaccination_service
        .get_vaccination_card(&context, program_enrolment_id)
    {
        Ok(vaccination_card) => Ok(VaccinationCardResponse::Response(
            VaccinationCardNode::from_domain(vaccination_card),
        )),
        Err(err) => match err {
            RepositoryError::NotFound => Ok(VaccinationCardResponse::Error(ErrorWrapper {
                error: NodeErrorInterface::RecordNotFound(RecordNotFound {}),
            })),
            _ => Err(StandardGraphqlError::from_repository_error(err)),
        },
    }
}

pub fn vaccination(
    ctx: &Context<'_>,
    store_id: String,
    id: String,
) -> Result<Option<VaccinationNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryEncounter,
            store_id: Some(store_id.clone()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    match service_provider
        .vaccination_service
        .get_vaccination(&context, id)
    {
        Ok(vaccination) => {
            let result = VaccinationNode::from_domain(vaccination);
            Ok(Some(result))
        }
        Err(err) => match err {
            RepositoryError::NotFound => Ok(None),
            _ => Err(StandardGraphqlError::from_repository_error(err)),
        },
    }
}
