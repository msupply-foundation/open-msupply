use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError, UniqueValueKey, UniqueValueViolation},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::ItemVariantNode;
use repository::item_variant::item_variant::ItemVariant;
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::{
        item_variant::{UpsertItemVariantError as ServiceError, UpsertItemVariantWithPackaging},
        packaging_variant::{UpsertPackagingVariant, UpsertPackagingVariantError},
    },
};

#[derive(InputObject)]
pub struct UpsertItemVariantInput {
    pub id: String,
    pub item_id: String,
    pub name: String,
    pub cold_storage_type_id: Option<String>,
    pub manufacturer_id: Option<String>,
    pub packaging_variants: Vec<PackagingVariantInput>,
}

#[derive(InputObject)]
pub struct PackagingVariantInput {
    pub id: String,
    pub name: String,
    pub packaging_level: u32,
    pub pack_size: Option<f64>,
    pub volume_per_unit: Option<f64>,
}

#[derive(SimpleObject)]
pub struct UpsertItemVariantError {
    pub error: UpsertItemVariantErrorInterface,
}
#[derive(Union)]
#[graphql(name = "UpsertPackVariantResponse")]
pub enum UpsertItemVariantResponse {
    Error(UpsertItemVariantError),
    Response(ItemVariantNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpsertItemVariantErrorInterface {
    InternalError(InternalError),
    DuplicateName(UniqueValueViolation),
    DatabaseError(DatabaseError),
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
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .item_service
        .upsert_item_variant(&service_context, input.to_domain());

    map_response(result)
}

impl UpsertItemVariantInput {
    pub fn to_domain(self) -> UpsertItemVariantWithPackaging {
        let UpsertItemVariantInput {
            id,
            item_id,
            name,
            cold_storage_type_id,
            manufacturer_id,
            packaging_variants,
        } = self;

        UpsertItemVariantWithPackaging {
            id: id.clone(),
            item_id,
            name,
            cold_storage_type_id,
            manufacturer_id,
            packaging_variants: packaging_variants
                .into_iter()
                .map(|v| PackagingVariantInput::to_domain(v, id.clone()))
                .collect(),
        }
    }
}
impl PackagingVariantInput {
    pub fn to_domain(self, item_variant_id: String) -> UpsertPackagingVariant {
        let PackagingVariantInput {
            id,
            name,
            packaging_level,
            pack_size,
            volume_per_unit,
        } = self;

        UpsertPackagingVariant {
            id,
            item_variant_id,
            name,
            packaging_level: packaging_level as i32,
            pack_size,
            volume_per_unit,
        }
    }
}

fn map_response(from: Result<ItemVariant, ServiceError>) -> Result<UpsertItemVariantResponse> {
    let result = match from {
        Ok(variant) => UpsertItemVariantResponse::Response(ItemVariantNode::from_domain(variant)),
        Err(error) => UpsertItemVariantResponse::Error(UpsertItemVariantError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<UpsertItemVariantErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured errors
        ServiceError::DuplicateName => {
            return Ok(UpsertItemVariantErrorInterface::DuplicateName(
                UniqueValueViolation(UniqueValueKey::Name),
            ))
        }
        // Generic errors
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::ItemDoesNotExist => InternalError(formatted_error),
        ServiceError::PackagingVariantError(upsert_packaging_variant_error) => {
            match upsert_packaging_variant_error {
                UpsertPackagingVariantError::ItemVariantDoesNotExist => {
                    BadUserInput(formatted_error)
                }
                UpsertPackagingVariantError::CantChangeItemVariant => BadUserInput(formatted_error),
                UpsertPackagingVariantError::LessThanZero(_field) => BadUserInput(formatted_error),

                UpsertPackagingVariantError::DatabaseError(_repository_error) => {
                    InternalError(formatted_error)
                }
                UpsertPackagingVariantError::CreatedRecordNotFound => {
                    InternalError(formatted_error)
                }
            }
        }
        ServiceError::DatabaseError(_repository_error) => InternalError(formatted_error),
        ServiceError::CantChangeItem => BadUserInput(formatted_error),

        ServiceError::ColdStorageTypeDoesNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
