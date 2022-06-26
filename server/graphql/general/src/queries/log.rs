use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{LogConnector, LogNodeType};
use repository::{EqualFilter, PaginationOption};
use repository::{LogFilter, LogSort, LogSortField};
use service::{
    auth::{Resource, ResourceAccessRequest},
    log::get_logs,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::LogSortField")]
#[graphql(rename_items = "camelCase")]
pub enum LogSortFieldInput {
    Id,
    LogType,
    UserId,
    RecordId,
}

#[derive(InputObject)]
pub struct LogSortInput {
    /// Sort query result by `key`
    key: LogSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterLogTypeInput {
    pub equal_to: Option<LogNodeType>,
    pub equal_any: Option<Vec<LogNodeType>>,
    pub not_equal_to: Option<LogNodeType>,
}

#[derive(InputObject, Clone)]
pub struct LogFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub log_type: Option<EqualFilterLogTypeInput>,
    pub user_id: Option<EqualFilterStringInput>,
    pub record_id: Option<EqualFilterStringInput>,
}

#[derive(Union)]
pub enum LogResponse {
    Response(LogConnector),
}

pub fn logs(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<LogFilterInput>,
    sort: Option<Vec<LogSortInput>>,
) -> Result<LogResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryLog,
            store_id: Some(store_id),
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_logs(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(LogResponse::Response(LogConnector::from_domain(items)))
}

impl LogFilterInput {
    pub fn to_domain(self) -> LogFilter {
        let LogFilterInput {
            id,
            log_type,
            user_id,
            record_id,
        } = self;

        LogFilter {
            id: id.map(EqualFilter::from),
            log_type: log_type.map(|t| map_filter!(t, LogNodeType::to_domain)),
            user_id: user_id.map(EqualFilter::from),
            record_id: record_id.map(EqualFilter::from),
        }
    }
}

impl LogSortInput {
    pub fn to_domain(self) -> LogSort {
        use LogSortField as to;
        use LogSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::LogType => to::LogType,
            from::UserId => to::UserId,
            from::RecordId => to::RecordId,
        };

        LogSort {
            key,
            desc: self.desc,
        }
    }
}
