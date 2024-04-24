use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError, RecordAlreadyExist},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::asset_catalogue_item_property_row::AssetCatalogueItemPropertyRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::insert_property::{
        InsertAssetCatalogueItemProperty, InsertAssetCatalogueItemPropertyError as ServiceError,
    },
};

#[derive(PartialEq, Debug)]
pub struct AssetCatalogueItemPropertyNode {
    pub asset_catalogue_item_property: AssetCatalogueItemPropertyRow,
}

#[derive(SimpleObject)]
pub struct AssetCatalogueItemPropertyConnector {
    nodes: Vec<AssetCatalogueItemPropertyNode>,
}

#[Object]
impl AssetCatalogueItemPropertyNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn catalogue_item_id(&self) -> &str {
        &self.row().catalogue_item_id
    }
    pub async fn catalogue_property_id(&self) -> &str {
        &self.row().catalogue_property_id
    }
    pub async fn value_string(&self) -> &Option<String> {
        &self.row().value_string
    }
    pub async fn value_int(&self) -> &Option<i32> {
        &self.row().value_int
    }
    pub async fn value_float(&self) -> &Option<f64> {
        &self.row().value_float
    }
    pub async fn value_bool(&self) -> &Option<bool> {
        &self.row().value_bool
    }
}
impl AssetCatalogueItemPropertyNode {
    pub fn from_domain(
        asset_catalogue_item_property: AssetCatalogueItemPropertyRow,
    ) -> AssetCatalogueItemPropertyNode {
        AssetCatalogueItemPropertyNode {
            asset_catalogue_item_property,
        }
    }

    pub fn row(&self) -> &AssetCatalogueItemPropertyRow {
        &self.asset_catalogue_item_property
    }
}

pub fn insert_asset_catalogue_item_property(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertAssetCatalogueItemPropertyInput,
) -> Result<InsertAssetCatalogueItemPropertyResponse> {
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
        .insert_asset_catalogue_item_property(&service_context, input.into())
    {
        Ok(property) => Ok(InsertAssetCatalogueItemPropertyResponse::Response(
            AssetCatalogueItemPropertyNode::from_domain(property),
        )),
        Err(error) => Ok(InsertAssetCatalogueItemPropertyResponse::Error(
            InsertAssetCatalogueItemPropertyError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject, Clone)]
pub struct InsertAssetCatalogueItemPropertyInput {
    pub id: String,
    pub catalogue_item_id: String,
    pub catalogue_property_id: String,
    pub value_string: Option<String>,
    pub value_int: Option<i32>,
    pub value_float: Option<f64>,
    pub value_bool: Option<bool>,
}

impl From<InsertAssetCatalogueItemPropertyInput> for InsertAssetCatalogueItemProperty {
    fn from(
        InsertAssetCatalogueItemPropertyInput {
            id,
            catalogue_item_id,
            catalogue_property_id,
            value_string,
            value_int,
            value_float,
            value_bool,
        }: InsertAssetCatalogueItemPropertyInput,
    ) -> Self {
        InsertAssetCatalogueItemProperty {
            id,
            catalogue_item_id,
            catalogue_property_id,
            value_string,
            value_int,
            value_float,
            value_bool,
        }
    }
}

#[derive(SimpleObject)]
pub struct InsertAssetCatalogueItemPropertyError {
    pub error: InsertAssetCatalogueItemPropertyErrorInterface,
}

#[derive(Union)]
pub enum InsertAssetCatalogueItemPropertyResponse {
    Error(InsertAssetCatalogueItemPropertyError),
    Response(AssetCatalogueItemPropertyNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertAssetCatalogueItemPropertyErrorInterface {
    ItemAlreadyExists(RecordAlreadyExist),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertAssetCatalogueItemPropertyErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::ItemAlreadyExists => {
            return Ok(
                InsertAssetCatalogueItemPropertyErrorInterface::ItemAlreadyExists(
                    RecordAlreadyExist {},
                ),
            )
        }

        // Standard Graphql Errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
