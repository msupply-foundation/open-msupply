use async_graphql::*;

use chrono::NaiveDate;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    simple_generic_errors::{
        DatabaseError, InternalError, RecordBelongsToAnotherStore, RecordNotFound,
        UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    asset::update::{UpdateAsset, UpdateAssetError as ServiceError},
    auth::{Resource, ResourceAccessRequest},
    NullableUpdate,
};

use crate::types::AssetNode;

pub fn update_asset(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateAssetInput,
) -> Result<UpdateAssetResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAsset,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .update_asset(&service_context, input.into())
    {
        Ok(asset) => Ok(UpdateAssetResponse::Response(AssetNode::from_domain(asset))),
        Err(error) => Ok(UpdateAssetResponse::Error(UpdateAssetError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct UpdateAssetInput {
    pub id: String,
    pub asset_number: Option<String>,
    pub notes: Option<String>,
    pub store_id: Option<NullableUpdateInput<String>>,
    pub serial_number: Option<NullableUpdateInput<String>>,
    pub catalogue_item_id: Option<NullableUpdateInput<String>>,
    pub installation_date: Option<NullableUpdateInput<NaiveDate>>,
    pub replacement_date: Option<NullableUpdateInput<NaiveDate>>,
    pub location_ids: Option<Vec<String>>,
}

impl From<UpdateAssetInput> for UpdateAsset {
    fn from(
        UpdateAssetInput {
            id,
            asset_number,
            notes,
            store_id,
            serial_number,
            catalogue_item_id,
            installation_date,
            replacement_date,
            location_ids,
        }: UpdateAssetInput,
    ) -> Self {
        UpdateAsset {
            id,
            asset_number,
            notes,
            store_id: store_id.map(|store_id| NullableUpdate {
                value: store_id.value,
            }),
            serial_number: serial_number.map(|serial_number| NullableUpdate {
                value: serial_number.value,
            }),
            catalogue_item_id: catalogue_item_id.map(|catalogue_item_id| NullableUpdate {
                value: catalogue_item_id.value,
            }),
            installation_date: installation_date.map(|installation_date| NullableUpdate {
                value: installation_date.value,
            }),
            replacement_date: replacement_date.map(|replacement_date| NullableUpdate {
                value: replacement_date.value,
            }),
            location_ids,
        }
    }
}

#[derive(SimpleObject)]
pub struct UpdateAssetError {
    pub error: UpdateAssetErrorInterface,
}

#[derive(Union)]
pub enum UpdateAssetResponse {
    Error(UpdateAssetError),
    Response(AssetNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateAssetErrorInterface {
    AssetNotFound(RecordNotFound),
    UniqueValueViolation(UniqueValueViolation),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<UpdateAssetErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::AssetDoesNotExist => BadUserInput(formatted_error),
        ServiceError::AssetDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::LocationDoesNotBelongToStore => BadUserInput(formatted_error),
        ServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::SerialNumberAlreadyExists => BadUserInput(formatted_error),
        ServiceError::LocationsAlreadyAssigned => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
