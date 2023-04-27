use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterNumberInput, EqualFilterStringInput},
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::BarcodeConnector;
use repository::{BarcodeFilter, BarcodeSort, BarcodeSortField};
use repository::{EqualFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::BarcodeSortField")]
pub enum BarcodeSortFieldInput {
    Id,
    Barcode,
}

#[derive(InputObject)]
pub struct BarcodeSortInput {
    /// Sort query result by `key`
    key: BarcodeSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct BarcodeFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub value: Option<EqualFilterStringInput>,
    pub item_id: Option<EqualFilterStringInput>,
    pub pack_size: Option<EqualFilterNumberInput>,
}

#[derive(Union)]
pub enum BarcodesResponse {
    Response(BarcodeConnector),
}

pub fn barcodes(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<BarcodeFilterInput>,
    sort: Option<Vec<BarcodeSortInput>>,
) -> Result<BarcodesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let service_provider = ctx.service_provider();
    let barcodes = service_provider
        .barcode_service
        .get_barcodes(
            connection_manager,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            // Currently only one sort option is supported, use the first from the list.
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(BarcodesResponse::Response(BarcodeConnector::from_domain(
        barcodes,
    )))
}

impl BarcodeFilterInput {
    pub fn to_domain(self) -> BarcodeFilter {
        let BarcodeFilterInput {
            id,
            value,
            item_id,
            pack_size,
        } = self;

        BarcodeFilter {
            id: id.map(EqualFilter::from),
            value: value.map(EqualFilter::from),
            item_id: item_id.map(EqualFilter::from),
            pack_size: pack_size.map(EqualFilter::<i32>::from),
        }
    }
}

impl BarcodeSortInput {
    pub fn to_domain(self) -> BarcodeSort {
        use BarcodeSortField as to;
        use BarcodeSortFieldInput as from;
        let key = match self.key {
            from::Id => to::Id,
            from::Barcode => to::Barcode,
        };

        BarcodeSort {
            key,
            desc: self.desc,
        }
    }
}
