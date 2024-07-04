use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueKey, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::insert::{InsertAssetCatalogueItem, InsertAssetCatalogueItemError as ServiceError},
};

use crate::types::asset_catalogue_item::AssetCatalogueItemNode;

pub fn insert_asset_catalogue_item(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertAssetCatalogueItemInput,
) -> Result<InsertAssetCatalogueItemResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAssetCatalogueItem,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .catalogue_service
        .insert_asset_catalogue_item(&service_context, input.into())
    {
        Ok(asset) => Ok(InsertAssetCatalogueItemResponse::Response(
            AssetCatalogueItemNode::from_domain(asset),
        )),
        Err(error) => Ok(InsertAssetCatalogueItemResponse::Error(
            InsertAssetCatalogueItemError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct InsertAssetCatalogueItemInput {
    pub id: String,
    pub sub_catalogue: String,
    pub category_id: String,
    pub class_id: String,
    pub code: String,
    pub manufacturer: Option<String>,
    pub model: String,
    pub type_id: String,
    pub properties: Option<String>,
}

impl From<InsertAssetCatalogueItemInput> for InsertAssetCatalogueItem {
    fn from(
        InsertAssetCatalogueItemInput {
            id,
            sub_catalogue,
            category_id,
            class_id,
            code,
            manufacturer,
            model,
            type_id,
            properties,
        }: InsertAssetCatalogueItemInput,
    ) -> Self {
        InsertAssetCatalogueItem {
            id,
            sub_catalogue,
            category_id,
            class_id,
            code,
            manufacturer,
            model,
            type_id,
            properties,
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertAssetCatalogueItemError {
    pub error: InsertAssetCatalogueItemErrorInterface,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
#[graphql(rename_items = "camelCase")]
pub enum UniqueCombinationKey {
    Manufacturer,
    Model,
}

pub struct UniqueCombinationViolation(pub Vec<UniqueCombinationKey>);
#[Object]
impl UniqueCombinationViolation {
    pub async fn description(&self) -> String {
        format!("Fields needs to be unique {:?}", self.0)
    }

    pub async fn fields(&self) -> Vec<UniqueCombinationKey> {
        self.0.clone()
    }
}

#[derive(Union)]
pub enum InsertAssetCatalogueItemResponse {
    Error(InsertAssetCatalogueItemError),
    Response(AssetCatalogueItemNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertAssetCatalogueItemErrorInterface {
    ItemAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    DuplicateManufacturerAndModel(UniqueCombinationViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertAssetCatalogueItemErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::ItemAlreadyExists => {
            return Ok(InsertAssetCatalogueItemErrorInterface::ItemAlreadyExists(
                RecordAlreadyExist {},
            ))
        }
        ServiceError::CodeAlreadyExists => {
            return Ok(
                InsertAssetCatalogueItemErrorInterface::UniqueValueViolation(UniqueValueViolation(
                    UniqueValueKey::Code,
                )),
            )
        }
        ServiceError::ManufacturerAndModelAlreadyExist => {
            return Ok(
                InsertAssetCatalogueItemErrorInterface::DuplicateManufacturerAndModel(
                    UniqueCombinationViolation(vec![
                        UniqueCombinationKey::Manufacturer,
                        UniqueCombinationKey::Model,
                    ]),
                ),
            )
        }

        // Standard Graphql Errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
