use async_graphql::*;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    simple_generic_errors::{
        DatabaseError, DoseConfigurationNotAllowed, InternalError, UniqueValueKey,
        UniqueValueViolation,
    },
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
    NullableUpdate,
};

#[derive(InputObject)]
pub struct UpsertItemVariantInput {
    pub id: String,
    pub item_id: String,
    pub name: String,
    pub cold_storage_type_id: Option<NullableUpdateInput<String>>,
    pub manufacturer_id: Option<NullableUpdateInput<String>>,
    pub packaging_variants: Vec<PackagingVariantInput>,
    pub doses_per_unit: i32,
    pub vvm_type: Option<NullableUpdateInput<String>>,
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
    DuplicateName(UniqueValueViolation),
    DoseConfigurationNotAllowed(DoseConfigurationNotAllowed),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

pub fn upsert_item_variant(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertItemVariantInput,
) -> Result<UpsertItemVariantResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateItemNamesCodesAndUnits,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;

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
            doses_per_unit,
            vvm_type,
        } = self;

        UpsertItemVariantWithPackaging {
            id: id.clone(),
            item_id,
            name,
            cold_storage_type_id: cold_storage_type_id.map(|cold_storage_type_id| NullableUpdate {
                value: cold_storage_type_id.value,
            }),
            manufacturer_id: manufacturer_id.map(|manufacturer_id| NullableUpdate {
                value: manufacturer_id.value,
            }),
            packaging_variants: packaging_variants
                .into_iter()
                .map(|v| PackagingVariantInput::to_domain(v, id.clone()))
                .collect(),
            doses_per_unit,
            vvm_type: vvm_type.map(|vvm_type| NullableUpdate {
                value: vvm_type.value,
            }),
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
        ServiceError::DoseConfigurationNotAllowed => {
            return Ok(
                UpsertItemVariantErrorInterface::DoseConfigurationNotAllowed(
                    DoseConfigurationNotAllowed,
                ),
            )
        }
        // Generic errors
        ServiceError::ItemDoesNotExist
        | ServiceError::CantChangeItem
        | ServiceError::ColdStorageTypeDoesNotExist
        | ServiceError::OtherPartyDoesNotExist
        | ServiceError::OtherPartyNotVisible
        | ServiceError::OtherPartyNotAManufacturer => BadUserInput(formatted_error),

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
        ServiceError::CreatedRecordNotFound | ServiceError::DatabaseError(_) => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
