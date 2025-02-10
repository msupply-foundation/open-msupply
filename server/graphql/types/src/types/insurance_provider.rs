use async_graphql::{Object, SimpleObject, Union};
use repository::InsuranceProviderRow;
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct InsuranceProviderNode {
    insurance_provider: InsuranceProviderRow,
}

#[derive(SimpleObject)]
pub struct InsuranceProviderConnector {
    total_count: u32,
    nodes: Vec<InsuranceProviderNode>,
}

#[derive(Union)]
pub enum InsuranceProviderResponse {
    Response(InsuranceProviderConnector),
}

#[Object]
impl InsuranceProviderNode {
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

    pub async fn comment(&self) -> Option<&str> {
        self.row().comment.as_deref()
    }
}

impl InsuranceProviderNode {
    pub fn from_domain(insurance_provider: InsuranceProviderRow) -> InsuranceProviderNode {
        InsuranceProviderNode { insurance_provider }
    }

    pub fn row(&self) -> &InsuranceProviderRow {
        &self.insurance_provider
    }
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
