use async_graphql::*;
use repository::InsuranceProviderRow;

#[derive(PartialEq, Debug)]
pub struct InsuranceProviderNode {
    insurance_provider: InsuranceProviderRow,
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
