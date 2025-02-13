use async_graphql::{
    dataloader::DataLoader, Context, Enum, InputObject, Object, Result, SimpleObject, Union,
};
use chrono::NaiveDate;
use graphql_core::{
    loader::InsuranceProviderByIdLoader,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InsuranceProviderNode;
use repository::name_insurance_join_row::{
    InsurancePolicyType, NameInsuranceJoinRow, NameInsuranceJoinSort, NameInsuranceJoinSortField,
};
use serde::Serialize;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum InsuranceSortFieldInput {
    ExpiryDate,
    IsActive,
}

#[derive(InputObject)]
pub struct InsuranceSortInput {
    /// Sort query result by `key`
    key: InsuranceSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InsurancePolicyNodeType {
    Personal,
    Business,
}

impl InsurancePolicyNodeType {
    pub fn from_domain(policy_type: &InsurancePolicyType) -> InsurancePolicyNodeType {
        use InsurancePolicyType::*;
        match policy_type {
            Personal => InsurancePolicyNodeType::Personal,
            Business => InsurancePolicyNodeType::Business,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct InsuranceNode {
    insurance: NameInsuranceJoinRow,
}

#[Object]
impl InsuranceNode {
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

#[derive(SimpleObject)]
pub struct InsuranceConnector {
    nodes: Vec<InsuranceNode>,
}

#[derive(Union)]
pub enum InsuranceResponse {
    Response(InsuranceConnector),
}

pub fn insurances(
    ctx: &Context<'_>,
    store_id: String,
    name_id: String,
    sort: Option<Vec<InsuranceSortInput>>,
) -> Result<InsuranceResponse> {
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
        .insurance_service
        .insurances(
            &service_context.connection,
            &name_id,
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(InsuranceResponse::Response(
        InsuranceConnector::from_domain(result),
    ))
}

impl InsuranceConnector {
    pub fn from_domain(insurances: Vec<NameInsuranceJoinRow>) -> InsuranceConnector {
        InsuranceConnector {
            nodes: insurances
                .into_iter()
                .map(InsuranceNode::from_domain)
                .collect(),
        }
    }
}

impl InsuranceNode {
    pub fn from_domain(insurance: NameInsuranceJoinRow) -> InsuranceNode {
        InsuranceNode { insurance }
    }

    pub fn row(&self) -> &NameInsuranceJoinRow {
        &self.insurance
    }
}

impl InsuranceSortInput {
    pub fn to_domain(self) -> NameInsuranceJoinSort {
        use InsuranceSortFieldInput as from;
        use NameInsuranceJoinSortField as to;
        let key = match self.key {
            from::ExpiryDate => to::ExpiryDate,
            from::IsActive => to::IsActive,
        };

        NameInsuranceJoinSort {
            key,
            desc: self.desc,
        }
    }
}
