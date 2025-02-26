use async_graphql::{Context, Enum, InputObject, Result, SimpleObject, Union};

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InsuranceNode;
use repository::name_insurance_join_row::{
    NameInsuranceJoinRow, NameInsuranceJoinSort, NameInsuranceJoinSortField,
};
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

#[derive(SimpleObject)]
pub struct InsuranceConnector {
    nodes: Vec<InsuranceNode>,
}

#[derive(Union)]
pub enum InsurancesResponse {
    Response(InsuranceConnector),
}

pub fn insurance(ctx: &Context<'_>, store_id: String, id: String) -> Result<InsuranceResponse> {
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
        .insurance(&service_context.connection, &id)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(InsuranceResponse::Response(InsuranceNode {
        insurance: result,
    }))
}

#[derive(Union)]
pub enum InsuranceResponse {
    Response(InsuranceNode),
}

pub fn insurances(
    ctx: &Context<'_>,
    store_id: String,
    name_id: String,
    sort: Option<Vec<InsuranceSortInput>>,
) -> Result<InsurancesResponse> {
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

    Ok(InsurancesResponse::Response(
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
