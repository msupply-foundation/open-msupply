use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_types::types::ItemVariantNode;
use repository::item_variant::item_variant_row::ItemVariantRow;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject)]
pub struct UpsertItemVariantInput {
    pub id: String,
    pub item_id: String,
    pub name: String,
    pub cold_storage_type_id: Option<String>,
    pub manufacturer_id: Option<String>,
    pub doses_per_unit: Option<u32>,
    pub packaging_variants: Vec<PackagingVariantInput>,
}

#[derive(InputObject)]
pub struct PackagingVariantInput {
    pub id: String,
    pub name: String,
    pub packaging_level: i32,
    pub pack_size: Option<f64>,
    pub volume_per_unit: Option<f64>,
}

#[derive(Union)]
#[graphql(name = "UpsertPackVariantResponse")]
pub enum UpsertItemVariantResponse {
    Response(ItemVariantNode),
}

pub fn upsert_item_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertItemVariantInput,
) -> Result<UpsertItemVariantResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItemNamesCodesAndUnits,
            store_id: Some(store_id.to_string()),
        },
    )?;

    Ok(UpsertItemVariantResponse::Response(
        ItemVariantNode::from_domain(ItemVariantRow {
            id: input.id,
            name: String::new(),
            item_link_id: String::new(),
            cold_storage_type_id: None,
            doses_per_unit: None,
            manufacturer_link_id: None,
            deleted_datetime: None,
        }),
    ))
}

// impl UpsertPackVariantInput {
//     pub fn to_domain(self) -> ServiceInput {
//         let UpsertPackVariantInput {
//             id,
//             item_id,
//             short_name,
//             long_name,
//             pack_size,
//         } = self;

//         ServiceInput {
//             id,
//             item_id,
//             short_name,
//             long_name,
//             pack_size,
//         }
//     }
// }

// fn map_response(from: Result<ItemVariantRow, ServiceError>) -> Result<UpsertResponse> {
//     let result = match from {
//         Ok(variant) => UpsertResponse::Response(ItemVariantNode::from_domain(variant)),
//         Err(error) => UpsertResponse::Error(UpsertError {
//             error: map_error(error)?,
//         }),
//     };

//     Ok(result)
// }

// fn map_error(error: ServiceError) -> Result<ErrorInterface> {
//     use StandardGraphqlError::*;
//     let formatted_error = format!("{:#?}", error);

//     let graphql_error = match error {
//         ServiceError::ItemDoesNotExist => BadUserInput(formatted_error),
//         ServiceError::DatabaseError(_) | ServiceError::CreatedRecordNotFound => {
//             InternalError(formatted_error)
//         }
//     };

//     Err(graphql_error.extend())
// }
