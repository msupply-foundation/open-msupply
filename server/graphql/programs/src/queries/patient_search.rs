use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::patient::{GenderTypeNode, PatientNode};
use repository::{GenderType, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    programs::patient::PatientSearch,
};

#[derive(InputObject, Clone)]
pub struct PatientSearchInput {
    /// Patient code
    code: Option<String>,
    /// Secondary patient code
    code_2: Option<String>,
    name: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    date_of_birth: Option<NaiveDate>,
    gender: Option<GenderTypeNode>,
    identifier: Option<String>,
}

pub struct PatientSearchNode {
    pub patient: PatientNode,
    /// Indicates how good the match was
    pub score: f64,
}

#[derive(SimpleObject)]
pub struct PatientSearchConnector {
    pub total_count: u32,
    pub nodes: Vec<PatientSearchNode>,
}

#[derive(Union)]
pub enum PatientSearchResponse {
    Response(PatientSearchConnector),
}

#[Object]
impl PatientSearchNode {
    async fn patient(&self) -> &PatientNode {
        &self.patient
    }

    async fn score(&self) -> f64 {
        self.score
    }
}

pub async fn patient_search(
    ctx: &Context<'_>,
    store_id: String,
    input: PatientSearchInput,
) -> Result<PatientSearchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPatient,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();
    let domain_input = input.to_domain();

    let connector = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let context = service_provider.basic_context()?;
        let result = service_provider.patient_service.patient_search(
            &context,
            &service_provider,
            domain_input,
            Some(&allowed_ctx),
        )?;
        let nodes = result
            .rows
            .into_iter()
            .map(|p| PatientSearchNode {
                patient: PatientNode {
                    store_id: store_id.clone(),
                    patient: p.patient,
                    allowed_ctx: allowed_ctx.clone(),
                },
                score: p.score,
            })
            .collect();
        Ok(PatientSearchConnector {
            total_count: result.count,
            nodes,
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(PatientSearchResponse::Response(connector))
}

impl PatientSearchInput {
    fn to_domain(self) -> PatientSearch {
        PatientSearch {
            code: self.code,
            code_2: self.code_2,
            name: self.name,
            first_name: self.first_name,
            last_name: self.last_name,
            date_of_birth: self.date_of_birth,
            gender: self.gender.map(GenderType::from),
            identifier: self.identifier,
        }
    }
}
