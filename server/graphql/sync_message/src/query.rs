use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    EqualFilter, PaginationOption, SyncMessageFilter, SyncMessageSort, SyncMessageSortField,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{SyncMessageConnector, SyncMessageNode, SyncMessageNodeStatus};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum SyncMessageSortFieldInput {
    Id,
    CreatedDatetime,
    Status,
}

#[derive(InputObject)]
pub struct SyncMessageSortInput {
    key: SyncMessageSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterSyncMessageStatusInput {
    pub equal_to: Option<SyncMessageNodeStatus>,
    pub equal_any: Option<Vec<SyncMessageNodeStatus>>,
    pub not_equal_to: Option<SyncMessageNodeStatus>,
}

#[derive(InputObject, Clone)]
pub struct SyncMessageFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub to_store_id: Option<EqualFilterStringInput>,
    pub from_store_id: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterSyncMessageStatusInput>,
}

#[derive(Union)]
pub enum SyncMessageListResponse {
    Response(SyncMessageConnector),
}

#[derive(Union)]
pub enum SyncMessageResponse {
    Error(RecordNotFound),
    Response(SyncMessageNode),
}

pub fn get_sync_message(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<SyncMessageResponse> {
    let _user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), _user.user_id)?;

    match service_provider
        .sync_message_service
        .get_sync_message(&service_context, id)
        .map_err(StandardGraphqlError::from_repository_error)
    {
        Ok(message) => match message {
            Some(sync_message_row) => Ok(SyncMessageResponse::Response(
                SyncMessageNode::from_domain(sync_message_row),
            )),
            None => Ok(SyncMessageResponse::Error(RecordNotFound {})),
        },
        Err(err) => Err(err),
    }
}

pub fn get_sync_messages(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<SyncMessageFilterInput>,
    sort: Option<Vec<SyncMessageSortInput>>,
) -> Result<SyncMessageListResponse> {
    let _user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), _user.user_id)?;

    let result = service_provider
        .sync_message_service
        .get_sync_messages(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(SyncMessageListResponse::Response(
        SyncMessageConnector::from_domain(result),
    ))
}

impl SyncMessageFilterInput {
    pub fn to_domain(self) -> SyncMessageFilter {
        SyncMessageFilter {
            id: self.id.map(EqualFilter::from),
            to_store_id: self.to_store_id.map(EqualFilter::from),
            from_store_id: self.from_store_id.map(EqualFilter::from),
            status: self.status.map(|status_filter| {
                let equal_to = status_filter.equal_to.map(|s| s.to_domain());
                let equal_any = status_filter
                    .equal_any
                    .map(|statuses| statuses.into_iter().map(|s| s.to_domain()).collect());
                let not_equal_to = status_filter.not_equal_to.map(|s| s.to_domain());

                EqualFilter {
                    equal_to,
                    equal_any,
                    not_equal_to,
                    equal_any_or_null: None,
                    not_equal_all: None,
                    not_equal_to_or_null: None,
                    is_null: None,
                }
            }),
        }
    }
}

impl SyncMessageSortInput {
    pub fn to_domain(self) -> SyncMessageSort {
        use SyncMessageSortField as to;
        use SyncMessageSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::CreatedDatetime => to::CreatedDatetime,
            from::Status => to::Status,
        };

        SyncMessageSort {
            key,
            desc: self.desc,
        }
    }
}
