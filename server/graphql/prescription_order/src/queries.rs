use async_graphql::*;
use graphql_core::{
    generic_filters::{
        DatetimeFilterInput, EqualFilterBigNumberInput, EqualFilterStringInput, StringFilterInput,
    },
    map_filter,
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    DatetimeFilter, EqualFilter, PaginationOption, PrescriptionOrderFilter, PrescriptionOrderSort,
    PrescriptionOrderSortField, PrescriptionOrderStatus, StringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{
    PrescriptionOrderConnector, PrescriptionOrderNode, PrescriptionOrderNodeStatus,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::prescription_order::PrescriptionOrderSortField")]
pub enum PrescriptionOrderSortFieldInput {
    PrescriptionOrderNumber,
    CreatedDatetime,
    PrescriptionDatetime,
    Status,
}

#[derive(InputObject)]
pub struct PrescriptionOrderSortInput {
    /// Sort query result by `key`
    key: PrescriptionOrderSortFieldInput,
    desc: Option<bool>,
}

impl PrescriptionOrderSortInput {
    pub fn to_domain(self) -> PrescriptionOrderSort {
        PrescriptionOrderSort {
            key: PrescriptionOrderSortField::from(self.key),
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EqualFilterPrescriptionOrderStatusInput {
    pub equal_to: Option<PrescriptionOrderNodeStatus>,
    pub equal_any: Option<Vec<PrescriptionOrderNodeStatus>>,
    pub not_equal_to: Option<PrescriptionOrderNodeStatus>,
    pub not_equal_all: Option<Vec<PrescriptionOrderNodeStatus>>,
}

#[derive(InputObject, Clone)]
pub struct PrescriptionOrderFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub status: Option<EqualFilterPrescriptionOrderStatusInput>,
    pub prescription_order_number: Option<EqualFilterBigNumberInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    pub patient_name: Option<StringFilterInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub prescription_datetime: Option<DatetimeFilterInput>,
}

impl PrescriptionOrderFilterInput {
    pub fn to_domain(self) -> PrescriptionOrderFilter {
        PrescriptionOrderFilter {
            id: self.id.map(EqualFilter::from),
            // store_id is enforced from the query argument in the service
            store_id: None,
            status: self
                .status
                .map(|t| map_filter!(t, PrescriptionOrderStatus::from)),
            prescription_order_number: self.prescription_order_number.map(EqualFilter::from),
            patient_id: self.patient_id.map(EqualFilter::from),
            patient_name: self.patient_name.map(StringFilter::from),
            created_datetime: self.created_datetime.map(DatetimeFilter::from),
            prescription_datetime: self.prescription_datetime.map(DatetimeFilter::from),
        }
    }
}

#[derive(Union)]
pub enum PrescriptionOrdersResponse {
    Response(PrescriptionOrderConnector),
}

#[derive(Union)]
pub enum PrescriptionOrderResponse {
    Error(RecordNotFound),
    Response(PrescriptionOrderNode),
}

pub fn get_prescription_order(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<PrescriptionOrderResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPrescription,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let order = service_provider
        .prescription_order_service
        .get_prescription_order(&service_context, Some(store_id), id)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(match order {
        Some(order) => {
            PrescriptionOrderResponse::Response(PrescriptionOrderNode::from_domain(order))
        }
        None => PrescriptionOrderResponse::Error(RecordNotFound {}),
    })
}

pub fn get_prescription_orders(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<PrescriptionOrderFilterInput>,
    sort: Option<Vec<PrescriptionOrderSortInput>>,
) -> Result<PrescriptionOrdersResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPrescription,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .prescription_order_service
        .get_prescription_orders(
            &service_context,
            Some(store_id),
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(PrescriptionOrdersResponse::Response(
        PrescriptionOrderConnector::from_domain(result),
    ))
}
