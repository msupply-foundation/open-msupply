use async_graphql::{Context, Enum, InputObject, Object, Result, SimpleObject, Union};
use chrono::NaiveDate;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    name_insurance_join_row::{
        InsurancePolicyType, NameInsuranceJoinFilter, NameInsuranceJoinRow, NameInsuranceJoinSort,
        NameInsuranceJoinSortField,
    },
    EqualFilter,
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

#[derive(InputObject, Clone)]
pub struct InsuranceFilterInput {
    pub insurance_provider_id: Option<EqualFilterStringInput>,
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
        &self.insurance.id
    }

    pub async fn name_link_id(&self) -> &str {
        &self.insurance.name_link_id
    }

    pub async fn insurance_provider_id(&self) -> &str {
        &self.insurance.insurance_provider_id
    }

    pub async fn policy_number_person(&self) -> Option<&str> {
        self.insurance.policy_number_person.as_deref()
    }

    pub async fn policy_number_family(&self) -> Option<&str> {
        self.insurance.policy_number_family.as_deref()
    }

    pub async fn policy_number(&self) -> &str {
        &self.insurance.policy_number
    }

    pub async fn policy_type(&self) -> InsurancePolicyNodeType {
        InsurancePolicyNodeType::from_domain(&self.insurance.policy_type)
    }

    pub async fn discount_percentage(&self) -> f64 {
        self.insurance.discount_percentage
    }

    pub async fn expiry_date(&self) -> NaiveDate {
        self.insurance.expiry_date
    }

    pub async fn is_active(&self) -> bool {
        self.insurance.is_active
    }

    pub async fn entered_by_id(&self) -> Option<&str> {
        self.insurance.entered_by_id.as_deref()
    }
}

#[derive(SimpleObject)]
pub struct InsuranceConnector {
    nodes: Vec<InsuranceNode>,
}

impl InsuranceConnector {
    pub fn from_domain(insurances: Vec<NameInsuranceJoinRow>) -> InsuranceConnector {
        InsuranceConnector {
            nodes: insurances
                .into_iter()
                .map(|insurance| InsuranceNode { insurance })
                .collect(),
        }
    }
}

#[derive(Union)]
pub enum InsuranceResponse {
    Response(InsuranceConnector),
}

pub fn insurances(
    ctx: &Context<'_>,
    store_id: String,
    name_link_id: String,
    filter: Option<InsuranceFilterInput>,
    sort: Option<Vec<InsuranceSortInput>>,
) -> Result<InsuranceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryInsurances,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = service_provider
        .insurance_service
        .insurances(
            &service_context.connection,
            &name_link_id,
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(InsuranceResponse::Response(
        InsuranceConnector::from_domain(result),
    ))
}

impl InsuranceFilterInput {
    pub fn to_domain(self) -> NameInsuranceJoinFilter {
        let InsuranceFilterInput {
            insurance_provider_id,
        } = self;

        NameInsuranceJoinFilter {
            insurance_provider_id: insurance_provider_id.map(EqualFilter::from),
        }
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
