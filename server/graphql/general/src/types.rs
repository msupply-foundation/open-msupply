use async_graphql::*;
use graphql_types::types::InsuranceProviderNode;
use repository::InsuranceProviderRow;
use service::ListResult;

#[derive(SimpleObject)]
pub struct InsuranceProviderConnector {
    total_count: u32,
    nodes: Vec<InsuranceProviderNode>,
}

#[derive(Union)]
pub enum InsuranceProviderResponse {
    Response(InsuranceProviderConnector),
}

impl InsuranceProviderConnector {
    pub fn from_domain(
        insurance_providers: ListResult<InsuranceProviderRow>,
    ) -> InsuranceProviderConnector {
        InsuranceProviderConnector {
            total_count: insurance_providers.count,
            nodes: insurance_providers
                .rows
                .iter()
                .map(|insurance_provider| {
                    InsuranceProviderNode::from_domain(insurance_provider.clone())
                })
                .collect(),
        }
    }
}
