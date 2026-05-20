use async_graphql::*;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{PropertyV2Node, PropertyV2ParentTableEnum, PropertyV2TypeEnum};
use repository::{PropertyV2RowRepository, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    property_v2::{
        configure_property_v2, ConfigurePropertyV2Input as ServiceInput,
        ConfigurePropertyV2OptionInput, PropertyV2AttachmentInput, PropertyV2ServiceError,
    },
};

use crate::mutations::property_errors::property_service_error_to_graphql;

#[derive(InputObject)]
pub struct PropertyV2AttachmentGqlInput {
    pub id: String,
    pub table: PropertyV2ParentTableEnum,
}

#[derive(InputObject)]
pub struct ConfigurePropertyV2OptionGqlInput {
    pub id: String,
    pub name: String,
    pub translation_key: Option<String>,
}

#[derive(InputObject)]
pub struct ConfigurePropertyV2GqlInput {
    pub id: String,
    pub r#type: PropertyV2TypeEnum,
    pub name: String,
    pub translation_key: Option<String>,
    pub attached_to: Vec<PropertyV2AttachmentGqlInput>,
    // Required for OPTION-type properties, empty otherwise.
    pub options: Vec<ConfigurePropertyV2OptionGqlInput>,
}

impl From<ConfigurePropertyV2GqlInput> for ServiceInput {
    fn from(input: ConfigurePropertyV2GqlInput) -> Self {
        ServiceInput {
            id: input.id,
            r#type: input.r#type.into(),
            name: input.name,
            translation_key: input.translation_key,
            attached_to: input
                .attached_to
                .into_iter()
                .map(|a| PropertyV2AttachmentInput {
                    id: a.id,
                    table: a.table.into(),
                })
                .collect(),
            options: input
                .options
                .into_iter()
                .map(|o| ConfigurePropertyV2OptionInput {
                    id: o.id,
                    name: o.name,
                    translation_key: o.translation_key,
                })
                .collect(),
        }
    }
}

pub fn configure_property_v2_mutation(
    ctx: &Context<'_>,
    input: ConfigurePropertyV2GqlInput,
) -> Result<PropertyV2Node> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigureProperty,
            store_id: None,
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let service_input: ServiceInput = input.into();
    let property_id = service_input.id.clone();

    configure_property_v2(connection_manager, service_input)
        .map_err(property_service_error_to_graphql)?;

    let connection = connection_manager
        .connection()
        .map_err(PropertyV2ServiceError::DatabaseError)
        .map_err(property_service_error_to_graphql)?;
    let row = PropertyV2RowRepository::new(&connection)
        .find_one_by_id(&property_id)
        .map_err(PropertyV2ServiceError::DatabaseError)
        .map_err(property_service_error_to_graphql)?
        .ok_or_else(|| {
            property_service_error_to_graphql(PropertyV2ServiceError::DatabaseError(
                RepositoryError::NotFound,
            ))
        })?;

    Ok(PropertyV2Node::from_domain(row))
}
