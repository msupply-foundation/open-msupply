use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{PropertyNode, PropertyNodeValueType};
use repository::types::PropertyValueType;
use repository::{NameProperty, NamePropertyRow};

use service::auth::{Resource, ResourceAccessRequest};
use service::name_property::{
    get_name_properties, initialise_name_properties, InitialiseNameProperty,
    InitialiseNamePropertyError,
};
use service::ListResult;

pub fn name_properties(ctx: &Context<'_>) -> Result<NamePropertyResponse> {
    let connection_manager = ctx.get_connection_manager();
    let properties = get_name_properties(connection_manager, None)
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(NamePropertyResponse::Response(
        NamePropertyConnector::from_domain(properties),
    ))
}

pub fn configure_name_properties(
    ctx: &Context<'_>,
    store_id: &str,
    input: Vec<ConfigureNamePropertyInput>,
) -> Result<ConfigureNamePropertiesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateNameProperties,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let connection_manager = ctx.get_connection_manager();

    let result = initialise_name_properties(
        connection_manager,
        input
            .into_iter()
            .map(ConfigureNamePropertyInput::to_domain)
            .collect(),
    );

    match result {
        Ok(_) => Ok(ConfigureNamePropertiesResponse::Response(Success)),
        Err(error) => {
            let formatted_error = format!("{:?}", error);

            let graphql_error = match error {
                // TODO: When there is a UI to enter the key, this should probably become structured error
                InitialiseNamePropertyError::PropertyKeyAlreadyExists => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                InitialiseNamePropertyError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };

            Err(graphql_error.extend())
        }
    }
}

#[derive(Union)]
pub enum NamePropertyResponse {
    Response(NamePropertyConnector),
}

#[derive(SimpleObject)]
pub struct NamePropertyConnector {
    total_count: u32,
    nodes: Vec<NamePropertyNode>,
}

impl NamePropertyConnector {
    pub fn from_domain(name_properties: ListResult<NameProperty>) -> NamePropertyConnector {
        NamePropertyConnector {
            total_count: name_properties.count,
            nodes: name_properties
                .rows
                .into_iter()
                .map(NamePropertyNode::from_domain)
                .collect(),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct NamePropertyNode {
    name_property: NameProperty,
}

#[Object]
impl NamePropertyNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn remote_editable(&self) -> &bool {
        &self.row().remote_editable
    }
    pub async fn property(&self) -> PropertyNode {
        PropertyNode::from_domain(self.name_property.property_row.clone())
    }
}

impl NamePropertyNode {
    pub fn from_domain(name_property: NameProperty) -> NamePropertyNode {
        NamePropertyNode { name_property }
    }

    pub fn row(&self) -> &NamePropertyRow {
        &self.name_property.name_property_row
    }
}

#[derive(Union)]
pub enum ConfigureNamePropertiesResponse {
    Response(Success),
}

#[derive(InputObject, Clone)]
pub struct ConfigureNamePropertyInput {
    pub id: String,
    pub key: String,
    pub property_id: String,
    pub name: String,
    pub value_type: PropertyNodeValueType,
    pub allowed_values: Option<String>,
    pub remote_editable: bool,
}

impl ConfigureNamePropertyInput {
    fn to_domain(self) -> InitialiseNameProperty {
        let ConfigureNamePropertyInput {
            id,
            key,
            property_id,
            name,
            value_type,
            allowed_values,
            remote_editable,
        } = self;

        InitialiseNameProperty {
            id,
            key,
            property_id,
            name,
            value_type: PropertyValueType::from(value_type),
            allowed_values,
            remote_editable,
        }
    }
}

pub struct Success;

#[Object]
impl Success {
    pub async fn success(&self) -> &bool {
        &true
    }
}
