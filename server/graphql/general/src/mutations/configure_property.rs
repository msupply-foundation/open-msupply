use async_graphql::*;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::{PropertyNode, PropertyParentTableEnum, PropertyTypeEnum};
use repository::{PropertyRowRepository, RepositoryError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    property::{
        configure_property, ConfigurePropertyInput as ServiceInput, ConfigurePropertyOptionInput,
        PropertyAttachmentInput, PropertyServiceError,
    },
};

use crate::mutations::property_errors::property_service_error_to_graphql;

#[derive(InputObject)]
pub struct PropertyAttachmentGqlInput {
    pub id: String,
    pub table: PropertyParentTableEnum,
}

#[derive(InputObject)]
pub struct ConfigurePropertyOptionGqlInput {
    pub id: String,
    pub name: String,
    pub translation_key: Option<String>,
}

#[derive(InputObject)]
pub struct ConfigurePropertyGqlInput {
    pub id: String,
    pub r#type: PropertyTypeEnum,
    pub name: String,
    pub translation_key: Option<String>,
    pub attached_to: Vec<PropertyAttachmentGqlInput>,
    // Required for OPTION-type properties, empty otherwise.
    pub options: Vec<ConfigurePropertyOptionGqlInput>,
}

impl From<ConfigurePropertyGqlInput> for ServiceInput {
    fn from(input: ConfigurePropertyGqlInput) -> Self {
        ServiceInput {
            id: input.id,
            r#type: input.r#type.into(),
            name: input.name,
            translation_key: input.translation_key,
            attached_to: input
                .attached_to
                .into_iter()
                .map(|a| PropertyAttachmentInput {
                    id: a.id,
                    table: a.table.into(),
                })
                .collect(),
            options: input
                .options
                .into_iter()
                .map(|o| ConfigurePropertyOptionInput {
                    id: o.id,
                    name: o.name,
                    translation_key: o.translation_key,
                })
                .collect(),
        }
    }
}

pub fn configure_property_mutation(
    ctx: &Context<'_>,
    input: ConfigurePropertyGqlInput,
) -> Result<PropertyNode> {
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

    configure_property(connection_manager, service_input)
        .map_err(property_service_error_to_graphql)?;

    let connection = connection_manager
        .connection()
        .map_err(PropertyServiceError::DatabaseError)
        .map_err(property_service_error_to_graphql)?;
    let row = PropertyRowRepository::new(&connection)
        .find_one_by_id(&property_id)
        .map_err(PropertyServiceError::DatabaseError)
        .map_err(property_service_error_to_graphql)?
        .ok_or_else(|| {
            property_service_error_to_graphql(PropertyServiceError::DatabaseError(
                RepositoryError::NotFound,
            ))
        })?;

    Ok(PropertyNode::from_domain(row))
}
