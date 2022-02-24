use async_graphql::*;
use domain::{PaginationOption, SimpleStringFilter};
use graphql_core::{
    generic_filters::SimpleStringFilterInput, pagination::PaginationInput,
    standard_graphql_error::list_error_to_gql_err, ContextExt,
};
use graphql_types::types::StoreNode;
use repository::StoreFilter;
#[derive(InputObject, Clone)]
pub struct StoreFilterInput {
    pub id: Option<SimpleStringFilterInput>,
}

impl From<StoreFilterInput> for StoreFilter {
    fn from(f: StoreFilterInput) -> Self {
        StoreFilter {
            id: f.id.map(SimpleStringFilter::from),
        }
    }
}

#[derive(SimpleObject)]
pub struct StoreConnector {
    total_count: u32,
    nodes: Vec<StoreNode>,
}

#[derive(Union)]
pub enum StoresResponse {
    Response(StoreConnector),
}

pub fn stores(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<StoreFilterInput>,
) -> Result<StoresResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;
    let service = &service_provider.store_service;

    // TODO add auth validation and restrict returned stores according to the user's permissions

    let result = service
        .get_stores(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(StoreFilter::from),
            None,
        )
        .map_err(list_error_to_gql_err)?;
    Ok(StoresResponse::Response({
        StoreConnector {
            total_count: result.count,
            nodes: result.rows.into_iter().map(StoreNode::from).collect(),
        }
    }))
}
