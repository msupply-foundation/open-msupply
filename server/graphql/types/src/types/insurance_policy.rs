use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::ContextExt;

use crate::types::InsuranceProviderNode;
use graphql_core::loader::InsuranceProviderByIdLoader;
use repository::name_insurance_join_row::{InsurancePolicyType, NameInsuranceJoinRow};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]

pub enum InsurancePolicyNodeType {
    Personal,
    Business,
}

#[derive(PartialEq, Debug)]
pub struct InsurancePolicyNode {
    pub insurance: NameInsuranceJoinRow,
}

#[Object]
impl InsurancePolicyNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn insurance_provider_id(&self) -> &str {
        &self.row().insurance_provider_id
    }

    pub async fn policy_number_person(&self) -> &Option<String> {
        &self.row().policy_number_person
    }

    pub async fn policy_number_family(&self) -> &Option<String> {
        &self.row().policy_number_family
    }

    pub async fn policy_number(&self) -> &String {
        &self.row().policy_number
    }

    pub async fn policy_type(&self) -> InsurancePolicyNodeType {
        InsurancePolicyNodeType::from_domain(&self.row().policy_type)
    }

    pub async fn discount_percentage(&self) -> &f64 {
        &self.row().discount_percentage
    }

    pub async fn expiry_date(&self) -> &NaiveDate {
        &self.row().expiry_date
    }

    pub async fn is_active(&self) -> &bool {
        &self.row().is_active
    }

    pub async fn insurance_providers(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<InsuranceProviderNode>> {
        let insurance_provider_id = &self.row().insurance_provider_id;

        let loader = ctx.get_loader::<DataLoader<InsuranceProviderByIdLoader>>();
        let result = loader.load_one(insurance_provider_id.clone()).await?;
        Ok(result.map(InsuranceProviderNode::from_domain))
    }
}

impl InsurancePolicyNodeType {
    pub fn from_domain(policy_type: &InsurancePolicyType) -> InsurancePolicyNodeType {
        use InsurancePolicyType::*;
        match policy_type {
            Personal => InsurancePolicyNodeType::Personal,
            Business => InsurancePolicyNodeType::Business,
        }
    }

    pub fn to_domain(&self) -> InsurancePolicyType {
        match self {
            InsurancePolicyNodeType::Personal => InsurancePolicyType::Personal,
            InsurancePolicyNodeType::Business => InsurancePolicyType::Business,
        }
    }
}

impl InsurancePolicyNode {
    pub fn from_domain(insurance: NameInsuranceJoinRow) -> InsurancePolicyNode {
        InsurancePolicyNode { insurance }
    }

    pub fn row(&self) -> &NameInsuranceJoinRow {
        &self.insurance
    }
}
