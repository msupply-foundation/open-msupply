use async_graphql::*;
use graphql_core::{
    dynamic_filter::{parse_dynamic_filter, validate_custom_field_filter_keys},
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
    DatetimeFilter, EqualFilter, PaginationOption, PrescriptionRequestCondition,
    PrescriptionRequestFilter, PrescriptionRequestSort, PrescriptionRequestSortField,
    PrescriptionRequestStatus, StringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_request::update::PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE;

use crate::types::{
    PrescriptionRequestConnector, PrescriptionRequestNode, PrescriptionRequestNodeStatus,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::prescription_request::PrescriptionRequestSortField")]
pub enum PrescriptionRequestSortFieldInput {
    PrescriptionRequestNumber,
    CreatedDatetime,
    PrescriptionDatetime,
    Status,
}

#[derive(InputObject)]
pub struct PrescriptionRequestSortInput {
    /// Sort query result by `key`
    key: PrescriptionRequestSortFieldInput,
    desc: Option<bool>,
}

impl PrescriptionRequestSortInput {
    pub fn to_domain(self) -> PrescriptionRequestSort {
        PrescriptionRequestSort {
            key: PrescriptionRequestSortField::from(self.key),
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct EqualFilterPrescriptionRequestStatusInput {
    pub equal_to: Option<PrescriptionRequestNodeStatus>,
    pub equal_any: Option<Vec<PrescriptionRequestNodeStatus>>,
    pub not_equal_to: Option<PrescriptionRequestNodeStatus>,
    pub not_equal_all: Option<Vec<PrescriptionRequestNodeStatus>>,
}

#[derive(InputObject, Clone)]
pub struct PrescriptionRequestFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub status: Option<EqualFilterPrescriptionRequestStatusInput>,
    pub prescription_request_number: Option<EqualFilterBigNumberInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    pub patient_name: Option<StringFilterInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub prescription_datetime: Option<DatetimeFilterInput>,
    /// The prescriber — the username of the account that created the request
    pub username: Option<StringFilterInput>,

    /// Dynamic filter condition AST, currently supporting custom field
    /// conditions on keys visible for the "prescription_request" scope, e.g.
    /// `{"And": [{"CustomField": {"key": "k", "filter": {"Text": {"Like": "abc"}}}}]}`
    pub dynamic_filter: Option<serde_json::Value>,
}

impl PrescriptionRequestFilterInput {
    pub fn to_domain(self) -> PrescriptionRequestFilter {
        PrescriptionRequestFilter {
            id: self.id.map(EqualFilter::from),
            // store_id is enforced from the query argument in the service
            store_id: None,
            status: self
                .status
                .map(|t| map_filter!(t, PrescriptionRequestStatus::from)),
            prescription_request_number: self.prescription_request_number.map(EqualFilter::from),
            patient_id: self.patient_id.map(EqualFilter::from),
            patient_name: self.patient_name.map(StringFilter::from),
            created_datetime: self.created_datetime.map(DatetimeFilter::from),
            prescription_datetime: self.prescription_datetime.map(DatetimeFilter::from),
            username: self.username.map(StringFilter::from),
            // Parsed and key-validated at the query boundary, not here
            dynamic_filter: None,
        }
    }
}

#[derive(Union)]
pub enum PrescriptionRequestsResponse {
    Response(PrescriptionRequestConnector),
}

#[derive(Union)]
pub enum PrescriptionRequestResponse {
    Error(RecordNotFound),
    Response(PrescriptionRequestNode),
}

pub fn get_prescription_request(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<PrescriptionRequestResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPrescriptionRequest,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let request = service_provider
        .prescription_request_service
        .get_prescription_request(&service_context, Some(store_id), id)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(match request {
        Some(request) => {
            PrescriptionRequestResponse::Response(PrescriptionRequestNode::from_domain(request))
        }
        None => PrescriptionRequestResponse::Error(RecordNotFound {}),
    })
}

pub fn get_prescription_requests(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<PrescriptionRequestFilterInput>,
    sort: Option<Vec<PrescriptionRequestSortInput>>,
) -> Result<PrescriptionRequestsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPrescriptionRequest,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    // Custom-field filter keys are validated against this scope's visible keys
    // at the trust boundary — an unknown or hidden key is an error, not a
    // silent no-match (same shape as the items/names queries).
    let filter = filter
        .map(|filter| -> Result<PrescriptionRequestFilter> {
            let dynamic_filter: Option<PrescriptionRequestCondition::Inner> =
                parse_dynamic_filter(filter.dynamic_filter.clone())?;
            if let Some(condition) = &dynamic_filter {
                validate_custom_field_filter_keys(
                    &service_context.connection,
                    PRESCRIPTION_REQUEST_CUSTOM_FIELD_SCOPE,
                    &condition.custom_field_conditions(),
                )?;
            }
            let mut filter = filter.to_domain();
            filter.dynamic_filter = dynamic_filter;
            Ok(filter)
        })
        .transpose()?;

    let result = service_provider
        .prescription_request_service
        .get_prescription_requests(
            &service_context,
            Some(store_id),
            page.map(PaginationOption::from),
            filter,
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(PrescriptionRequestsResponse::Response(
        PrescriptionRequestConnector::from_domain(result),
    ))
}
