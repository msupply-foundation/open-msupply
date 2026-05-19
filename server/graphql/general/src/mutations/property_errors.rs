use async_graphql::{ErrorExtensions, FieldError};
use service::property::PropertyServiceError;

// Maps the service error enum to a top-level graphql error with a stable
// `code` extension. Front-ends switch on the code rather than the message.
pub fn property_service_error_to_graphql(error: PropertyServiceError) -> FieldError {
    use PropertyServiceError::*;
    let (code, message) = match &error {
        PropertyNotFound(id) => ("PROPERTY_NOT_FOUND", format!("Property '{id}' not found")),
        OptionNotFoundForProperty {
            property_id,
            option_id,
        } => (
            "OPTION_NOT_FOUND_FOR_PROPERTY",
            format!("Option '{option_id}' not found for property '{property_id}'"),
        ),
        OptionDoesNotMatchPropertyType {
            property_id,
            property_type,
        } => (
            "OPTION_DOES_NOT_MATCH_PROPERTY",
            format!(
                "Option does not belong to property '{property_id}' (type '{property_type}')"
            ),
        ),
        ValueDoesNotMatchPropertyType {
            property_id,
            property_type,
        } => (
            "VALUE_DOES_NOT_MATCH_PROPERTY_TYPE",
            format!("Value does not match property '{property_id}' type '{property_type}'"),
        ),
        DatabaseError(err) => ("INTERNAL_ERROR", format!("Database error: {err:?}")),
    };

    async_graphql::Error::new(message).extend_with(|_, e| {
        e.set("code", code);
    })
}
