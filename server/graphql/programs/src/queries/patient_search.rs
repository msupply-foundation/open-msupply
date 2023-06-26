use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_general::GenderInput;
use service::{
    auth::{CapabilityTag, Resource, ResourceAccessRequest},
    programs::patient::PatientSearch,
    usize_to_u32,
};

use super::PatientNode;

#[derive(InputObject, Clone)]
pub struct PatientSearchInput {
    /// Patient code
    code: Option<String>,
    /// Secondary patient code
    code_2: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    date_of_birth: Option<NaiveDate>,
    gender: Option<GenderInput>,
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

pub fn patient_search(
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
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let result: Vec<PatientSearchNode> = service_provider
        .patient_service
        .patient_search(&context, service_provider, &store_id, input.to_domain())?
        .into_iter()
        .map(|p| PatientSearchNode {
            patient: PatientNode {
                store_id: store_id.clone(),
                patient: p.patient,
                allowed_docs: allowed_docs.clone(),
            },
            score: p.score,
        })
        .collect();

    Ok(PatientSearchResponse::Response(PatientSearchConnector {
        total_count: usize_to_u32(result.len()),
        nodes: result,
    }))
}

impl PatientSearchInput {
    fn to_domain(self) -> PatientSearch {
        PatientSearch {
            code: self.code,
            code_2: self.code_2,
            first_name: self.first_name,
            last_name: self.last_name,
            date_of_birth: self.date_of_birth,
            gender: self.gender.map(|g| g.to_domain()),
        }
    }
}
