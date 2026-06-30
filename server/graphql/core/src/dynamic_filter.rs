// The `dynamicFilter: JSON` filter input: a client-provided condition AST
// (serde shape of a create_condition! module's Inner enum, currently property
// conditions only) that is deserialized and validated at this trust boundary,
// then attached to the domain filter.
//
// Example wire shape:
// `{ "And": [ { "CustomField": { "key": "k", "filter": { "Number": { "GreaterThanOrEqual": 10.0 } } } } ] }`

use async_graphql::ErrorExtensions;
use repository::{CustomFieldCondition, CustomFieldRepository, StorageConnection};

use crate::standard_graphql_error::StandardGraphqlError;

/// Deserialize a `dynamicFilter` JSON value into a condition AST (e.g.
/// `NameCondition::Inner`). A malformed AST is the client's error.
pub fn parse_dynamic_filter<T: serde::de::DeserializeOwned>(
    value: Option<serde_json::Value>,
) -> async_graphql::Result<Option<T>> {
    value
        .map(|value| serde_json::from_value(value))
        .transpose()
        .map_err(|error| {
            StandardGraphqlError::BadUserInput(format!("Invalid dynamicFilter: {error}")).extend()
        })
}

/// Property keys a client may filter on are exactly those visible for the
/// table scope ("patient" or "item") — unknown or hidden keys are an explicit
/// error rather than a silent no-match.
pub fn validate_custom_field_filter_keys(
    connection: &StorageConnection,
    table_scope: &str,
    conditions: &[&CustomFieldCondition],
) -> async_graphql::Result<()> {
    validate_custom_field_filter_keys_multi(connection, &[table_scope], conditions)
}

/// Like [`validate_custom_field_filter_keys`] but accepts several table scopes
/// and validates against their **union** — used by the `names` query, which
/// lists customers and suppliers together so a filter key visible in either the
/// `"customer"` or `"supplier"` scope must be accepted.
pub fn validate_custom_field_filter_keys_multi(
    connection: &StorageConnection,
    table_scopes: &[&str],
    conditions: &[&CustomFieldCondition],
) -> async_graphql::Result<()> {
    if conditions.is_empty() {
        return Ok(());
    }

    // Defense in depth: a `"` would break the quoted SQLite JSON path syntax
    // (`$."key"`), and no sane property key contains one
    if let Some(condition) = conditions.iter().find(|c| c.key.contains('"')) {
        return Err(StandardGraphqlError::BadUserInput(format!(
            "Invalid property filter key: {}",
            condition.key
        ))
        .extend());
    }

    let repository = CustomFieldRepository::new(connection);
    let mut allowed_keys = std::collections::HashSet::new();
    for table_scope in table_scopes {
        allowed_keys.extend(
            repository
                .allowed_keys_for_table(table_scope)
                .map_err(|error| StandardGraphqlError::from_repository_error(error))?,
        );
    }

    let unknown_keys: Vec<&str> = conditions
        .iter()
        .map(|condition| condition.key.as_str())
        .filter(|key| !allowed_keys.contains(*key))
        .collect();

    if !unknown_keys.is_empty() {
        return Err(StandardGraphqlError::BadUserInput(format!(
            "Unknown property filter key(s) for {}: {}",
            table_scopes.join(", "),
            unknown_keys.join(", ")
        ))
        .extend());
    }

    Ok(())
}
