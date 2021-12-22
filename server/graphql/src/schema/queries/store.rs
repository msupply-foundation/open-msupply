use async_graphql::*;
use domain::{PaginationOption, SimpleStringFilter};
use repository::{schema::StoreRow, StoreFilter};

use crate::{
    schema::types::{sort_filter_types::SimpleStringFilterInput, PaginationInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

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

#[derive(PartialEq, Debug)]
pub struct StoreNode {
    store: StoreRow,
}

#[Object]
impl StoreNode {
    pub async fn id(&self) -> &str {
        &self.store.id
    }

    pub async fn code(&self) -> &str {
        &self.store.code
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
) -> Result<StoresResponse, StandardGraphqlError> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;
    let service = &service_provider.store_service;

    // TODO add auth validation and restrict returned stores according to the user's permissions

    let result = service.get_stores(
        &service_context,
        page.map(PaginationOption::from),
        filter.map(StoreFilter::from),
        None,
    )?;
    Ok(StoresResponse::Response({
        StoreConnector {
            total_count: result.count,
            nodes: result.rows.into_iter().map(StoreNode::from).collect(),
        }
    }))
}

impl From<StoreRow> for StoreNode {
    fn from(store: StoreRow) -> Self {
        StoreNode { store }
    }
}
