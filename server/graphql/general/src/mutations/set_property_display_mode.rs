use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::PropertyNodeDisplayModeV2;
use repository::PropertyDisplayModeV2;
use service::{
    auth::{Resource, ResourceAccessRequest},
    property_v2::{SetPropertyDisplayMode, SetPropertyDisplayModeError as ServiceError},
};

/// The settable display modes for a property scope. Excludes the repository
/// enum's forwards-compat `Other` variant — a client can't author an unknown
/// mode, only modes this site understands.
#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum PropertyDisplayModeV2Input {
    Hidden,
    Visible,
    Prominent,
}

impl From<PropertyDisplayModeV2Input> for PropertyDisplayModeV2 {
    fn from(mode: PropertyDisplayModeV2Input) -> Self {
        match mode {
            PropertyDisplayModeV2Input::Hidden => PropertyDisplayModeV2::Hidden,
            PropertyDisplayModeV2Input::Visible => PropertyDisplayModeV2::Visible,
            PropertyDisplayModeV2Input::Prominent => PropertyDisplayModeV2::Prominent,
        }
    }
}

#[derive(InputObject)]
pub struct SetPropertyDisplayModeInput {
    pub property_id: String,
    pub table_name: String,
    /// Omit (or pass `null`) to *disassociate* the property from the scope
    /// (removes the `property_table_v2` row). This differs from `HIDDEN`:
    /// a hidden-but-associated property still transfers between records.
    pub display_mode: Option<PropertyDisplayModeV2Input>,
}

#[derive(SimpleObject)]
pub struct SetPropertyDisplayModeNode {
    pub property_id: String,
    pub table_name: String,
    /// The resulting display mode, or `null` when the property was
    /// disassociated from the scope.
    pub display_mode: Option<PropertyNodeDisplayModeV2>,
}

#[derive(Union)]
pub enum SetPropertyDisplayModeResponse {
    Response(SetPropertyDisplayModeNode),
}

pub fn set_property_display_mode(
    ctx: &Context<'_>,
    input: SetPropertyDisplayModeInput,
) -> Result<SetPropertyDisplayModeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePropertyDisplayMode,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let SetPropertyDisplayModeInput {
        property_id,
        table_name,
        display_mode,
    } = input;

    let result = service_provider.property_v2_service.set_property_display_mode(
        &service_context,
        SetPropertyDisplayMode {
            property_id: property_id.clone(),
            table_name: table_name.clone(),
            display_mode: display_mode.map(PropertyDisplayModeV2::from),
        },
    );

    match result {
        Ok(row) => Ok(SetPropertyDisplayModeResponse::Response(
            SetPropertyDisplayModeNode {
                property_id,
                table_name,
                display_mode: row.map(|row| PropertyNodeDisplayModeV2::from(row.display_mode)),
            },
        )),
        Err(error) => {
            let formatted_error = format!("{error:#?}");
            let graphql_error = match error {
                ServiceError::PropertyDoesNotExist | ServiceError::InvalidTableName => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
                ServiceError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
            };
            Err(graphql_error.extend())
        }
    }
}
