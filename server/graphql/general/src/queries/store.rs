use async_graphql::*;
use graphql_core::generic_filters::{EqualFilterInput, EqualFilterStringInput};
use graphql_core::{
    generic_filters::SimpleStringFilterInput, pagination::PaginationInput,
    standard_graphql_error::list_error_to_gql_err, ContextExt,
};
use graphql_types::types::StoreNode;
use repository::{EqualFilter, StoreFilter, StoreSort, StoreSortField};
use repository::{PaginationOption, SimpleStringFilter};

#[derive(InputObject, Clone)]
pub struct StoreFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub code: Option<SimpleStringFilterInput>,
    pub name: Option<SimpleStringFilterInput>,
    pub name_code: Option<SimpleStringFilterInput>,
    pub remote_site_id: Option<EqualFilterInput<i32>>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum StoreSortFieldInput {
    Code,
    Name,
    NameCode,
}

#[derive(InputObject)]
pub struct StoreSortInput {
    /// Sort query result by `key`
    key: StoreSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
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
    sort: Option<Vec<StoreSortInput>>,
) -> Result<StoresResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;
    let service = &service_provider.general_service;

    // TODO add auth validation and restrict returned stores according to the user's permissions

    let result = service
        .get_stores(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            // Currently only one sort option is supported, use the first from the list.
            sort.map(|mut sort_list| sort_list.pop())
                .flatten()
                .map(|sort| sort.to_domain()),
        )
        .map_err(list_error_to_gql_err)?;
    Ok(StoresResponse::Response({
        StoreConnector {
            total_count: result.count,
            nodes: result
                .rows
                .into_iter()
                .map(StoreNode::from_domain)
                .collect(),
        }
    }))
}

impl StoreFilterInput {
    fn to_domain(self) -> StoreFilter {
        let StoreFilterInput {
            id,
            code,
            name,
            name_code,
            remote_site_id,
        } = self;

        StoreFilter {
            id: id.map(EqualFilter::from),
            code: code.map(SimpleStringFilter::from),
            name: name.map(SimpleStringFilter::from),
            name_code: name_code.map(SimpleStringFilter::from),
            remote_site_id: remote_site_id.map(EqualFilter::from),
        }
    }
}

impl StoreSortInput {
    pub fn to_domain(self) -> StoreSort {
        let key = match self.key {
            StoreSortFieldInput::Code => StoreSortField::Code,
            StoreSortFieldInput::Name => StoreSortField::Name,
            StoreSortFieldInput::NameCode => StoreSortField::NameCode,
        };

        StoreSort {
            key,
            desc: self.desc,
        }
    }
}
