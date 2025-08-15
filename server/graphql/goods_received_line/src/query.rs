use crate::types::{GoodsReceivedLineConnector, GoodsReceivedLineNode};
use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_core::{
    generic_filters::EqualFilterStringInput, simple_generic_errors::RecordNotFound,
};
use repository::GoodsReceivedLineFilter;
use repository::GoodsReceivedLineSort;
use repository::GoodsReceivedLineSortField;
use repository::PaginationOption;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;

use repository::EqualFilter;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum GoodsReceivedLineSortFieldInput {
    ItemName,
    LineNumber,
    ExpiryDate,
}

#[derive(InputObject)]
pub struct GoodsReceivedLineSortInput {
    /// Sort query result by `key`
    key: GoodsReceivedLineSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct GoodsReceivedLineFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub goods_received_id: Option<EqualFilterStringInput>,
}

#[derive(Union)]
pub enum GoodsReceivedLinesResponse {
    Response(GoodsReceivedLineConnector),
}

#[derive(Union)]
pub enum GoodsReceivedLineResponse {
    Error(RecordNotFound),
    Response(GoodsReceivedLineNode),
}

pub fn get_goods_received_line(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<GoodsReceivedLineResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .goods_received_line_service
        .get_goods_received_line(&service_context, Some(&store_id), id)
        .map_err(StandardGraphqlError::from_repository_error)
    {
        Ok(line) => {
            let result = match line {
                Some(goods_received_line) => GoodsReceivedLineResponse::Response(
                    GoodsReceivedLineNode::from_domain(goods_received_line),
                ),
                None => GoodsReceivedLineResponse::Error(RecordNotFound {}),
            };
            Ok(result)
        }
        Err(err) => Err(err),
    }
}

pub fn get_goods_received_lines(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<GoodsReceivedLineFilterInput>,
    sort: Option<Vec<GoodsReceivedLineSortInput>>,
) -> Result<GoodsReceivedLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let list_result = service_provider
        .goods_received_line_service
        .get_goods_received_lines(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GoodsReceivedLinesResponse::Response(
        GoodsReceivedLineConnector::from_domain(list_result),
    ))
}

impl GoodsReceivedLineFilterInput {
    pub fn to_domain(self) -> GoodsReceivedLineFilter {
        GoodsReceivedLineFilter {
            id: self.id.map(EqualFilter::from),
            goods_received_id: self.goods_received_id.map(EqualFilter::from),
            store_id: None, // Store ID is handled in the service layer
        }
    }
}

impl GoodsReceivedLineSortInput {
    pub fn to_domain(self) -> GoodsReceivedLineSort {
        use GoodsReceivedLineSortField as to;
        use GoodsReceivedLineSortFieldInput as from;
        let key = match self.key {
            from::ItemName => to::ItemName,
            from::LineNumber => to::LineNumber,
            from::ExpiryDate => to::ExpiryDate,
        };

        GoodsReceivedLineSort {
            key,
            desc: self.desc,
        }
    }
}
