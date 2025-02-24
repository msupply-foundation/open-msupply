use async_graphql::{Context, Object, Result, SimpleObject, Union};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::InsuranceProviderRow;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(PartialEq, Debug)]
pub struct InsuranceProvidersNode {
    insurance_provider: InsuranceProviderRow,
}

#[Object]
impl InsuranceProvidersNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn provider_name(&self) -> &str {
        &self.row().provider_name
    }

    pub async fn is_active(&self) -> bool {
        self.row().is_active
    }

    pub async fn prescription_validity_days(&self) -> Option<i32> {
        self.row().prescription_validity_days
    }
}

impl InsuranceProvidersNode {
    pub fn from_domain(insurance_provider: InsuranceProviderRow) -> InsuranceProvidersNode {
        InsuranceProvidersNode { insurance_provider }
    }

    pub fn row(&self) -> &InsuranceProviderRow {
        &self.insurance_provider
    }
}

#[derive(SimpleObject)]
pub struct InsuranceProvidersConnector {
    nodes: Vec<InsuranceProvidersNode>,
}

impl InsuranceProvidersConnector {
    pub fn from_domain(
        insurance_providers: Vec<InsuranceProviderRow>,
    ) -> InsuranceProvidersConnector {
        InsuranceProvidersConnector {
            nodes: insurance_providers
                .into_iter()
                .map(InsuranceProvidersNode::from_domain)
                .collect(),
        }
    }
}

#[derive(Union)]
pub enum InsuranceProvidersResponse {
    Response(InsuranceProvidersConnector),
}

pub fn insurance_providers(
    ctx: &Context<'_>,
    store_id: String,
) -> Result<InsuranceProvidersResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPatient,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = service_provider
        .insurance_provider_service
        .insurance_providers(&service_context.connection)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(InsuranceProvidersResponse::Response(
        InsuranceProvidersConnector::from_domain(result),
    ))
}
