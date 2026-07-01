use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::loader::CustomFieldOptionsByCustomFieldIdLoader;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use repository::{CustomFieldDisplayMode, CustomFieldOptionRow, CustomField, CustomFieldRow};
use serde::Serialize;
use service::ListResult;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CustomFieldNodeValueType {
    Integer,
    Text,
    Date,
    Real,
    Option,
    Boolean,
}

impl From<repository::CustomFieldValueType> for CustomFieldNodeValueType {
    fn from(value: repository::CustomFieldValueType) -> Self {
        use repository::CustomFieldValueType as RepoType;
        match value {
            RepoType::Integer => Self::Integer,
            RepoType::Text => Self::Text,
            RepoType::Date => Self::Date,
            RepoType::Real => Self::Real,
            RepoType::Option => Self::Option,
            RepoType::Boolean => Self::Boolean,
            // Any unrecognised value type from a newer central. Rows whose
            // value type is the `Other` catch-all are filtered out at the
            // repository read path (CustomFieldRepository::is_displayable), so
            // `Other` never reaches here — default it to Text defensively.
            RepoType::Other(_) => Self::Text,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CustomFieldNodeKind {
    /// Configured natively in open-mSupply.
    Standard,
    /// Synced from legacy mSupply.
    Legacy,
}

impl From<repository::CustomFieldKind> for CustomFieldNodeKind {
    fn from(value: repository::CustomFieldKind) -> Self {
        use repository::CustomFieldKind as RepoKind;
        match value {
            RepoKind::Legacy => Self::Legacy,
            // Standard, plus any unrecognised kind from a newer central. Rows
            // whose kind is the `Other` catch-all are filtered out at the
            // repository read path (CustomFieldRepository::is_displayable), so
            // `Other` never reaches here — default it to Standard defensively.
            RepoKind::Standard | RepoKind::Other(_) => Self::Standard,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CustomFieldNodeDisplayMode {
    /// Not shown on this scope.
    Hidden,
    /// Shown wherever the scope lists its custom_fields (e.g. the CustomFields tab).
    Visible,
    /// Visible, and additionally promoted to the scope's primary surface (e.g.
    /// the invoice detail-view toolbar).
    Prominent,
    /// A mode configured on a newer central that this site doesn't yet recognise
    /// (the repository enum's `Other(String)` catch-all). Mapped manually rather
    /// than via `#[graphql(remote)]` because the GraphQL enum can't carry the
    /// captured string payload. Treated as non-hidden (shown) on read.
    Other,
}

impl From<CustomFieldDisplayMode> for CustomFieldNodeDisplayMode {
    fn from(value: CustomFieldDisplayMode) -> Self {
        match value {
            CustomFieldDisplayMode::Hidden => Self::Hidden,
            CustomFieldDisplayMode::Visible => Self::Visible,
            CustomFieldDisplayMode::Prominent => Self::Prominent,
            CustomFieldDisplayMode::Other(_) => Self::Other,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct CustomFieldNode {
    pub custom_field: CustomFieldRow,
    /// Per-scope display mode — only set when the custom_field was queried with a
    /// single `scope` filter (otherwise `None`).
    pub display_mode: Option<CustomFieldDisplayMode>,
}

#[derive(PartialEq, Debug)]
pub struct CustomFieldOptionNode {
    pub option: CustomFieldOptionRow,
}

#[derive(SimpleObject)]
pub struct CustomFieldConnector {
    pub total_count: u32,
    pub nodes: Vec<CustomFieldNode>,
}

#[derive(Union)]
pub enum CustomFieldsResponse {
    Response(CustomFieldConnector),
}

#[Object]
impl CustomFieldNode {
    pub async fn id(&self) -> &str {
        &self.custom_field.id
    }
    pub async fn key(&self) -> &str {
        &self.custom_field.key
    }
    pub async fn name(&self) -> &str {
        &self.custom_field.name
    }
    pub async fn value_type(&self) -> CustomFieldNodeValueType {
        CustomFieldNodeValueType::from(self.custom_field.value_type.clone())
    }
    pub async fn kind(&self) -> CustomFieldNodeKind {
        CustomFieldNodeKind::from(self.custom_field.kind.clone())
    }

    /// How prominently this custom_field is shown on the queried scope
    /// (`null` when the query wasn't scoped to a single `scope`). Clients
    /// promote `PROMINENT` custom_fields to the record's primary surface, e.g. the
    /// invoice detail-view toolbar.
    pub async fn display_mode(&self) -> Option<CustomFieldNodeDisplayMode> {
        self.display_mode
            .as_ref()
            .map(|mode| CustomFieldNodeDisplayMode::from(mode.clone()))
    }

    /// Options for OPTION-type custom_fields. Empty list for any other value
    /// type. Resolved via dataloader so a list of N custom_fields triggers a
    /// single batched lookup.
    pub async fn options(&self, ctx: &Context<'_>) -> Result<Vec<CustomFieldOptionNode>> {
        let loader = ctx.get_loader::<DataLoader<CustomFieldOptionsByCustomFieldIdLoader>>();
        let options = loader
            .load_one(self.custom_field.id.clone())
            .await
            .map_err(StandardGraphqlError::from_repository_error)?
            .unwrap_or_default();
        Ok(options.into_iter().map(CustomFieldOptionNode::from_domain).collect())
    }
}

#[Object]
impl CustomFieldOptionNode {
    pub async fn id(&self) -> &str {
        &self.option.id
    }
    pub async fn custom_field_id(&self) -> &str {
        &self.option.custom_field_id
    }
    pub async fn key(&self) -> &str {
        &self.option.key
    }
    pub async fn name(&self) -> &str {
        &self.option.name
    }
    pub async fn parent_option_id(&self) -> &Option<String> {
        &self.option.parent_option_id
    }
}

impl CustomFieldNode {
    pub fn from_domain(custom_field: CustomField) -> CustomFieldNode {
        CustomFieldNode {
            custom_field: custom_field.custom_field,
            display_mode: custom_field.display_mode,
        }
    }
}

impl CustomFieldOptionNode {
    pub fn from_domain(option: CustomFieldOptionRow) -> CustomFieldOptionNode {
        CustomFieldOptionNode { option }
    }
}

impl CustomFieldConnector {
    pub fn from_domain(result: ListResult<CustomField>) -> CustomFieldConnector {
        CustomFieldConnector {
            total_count: result.count,
            nodes: result.rows.into_iter().map(CustomFieldNode::from_domain).collect(),
        }
    }
}

/// Filters a raw `custom_fields` JSONB blob down to keys allowed for a given
/// table. Stray keys (not defined in `custom_field`, soft-deleted, or with a
/// `custom_field_scope.display_mode = HIDDEN`) are dropped. Non-object JSON is
/// returned untouched — that shape isn't expected, but better than silently
/// dropping data.
pub fn filter_custom_fields(
    raw: serde_json::Value,
    allowed_keys: &std::collections::HashSet<String>,
) -> serde_json::Value {
    match raw {
        serde_json::Value::Object(map) => {
            let filtered: serde_json::Map<String, serde_json::Value> = map
                .into_iter()
                .filter(|(k, _)| allowed_keys.contains(k))
                .collect();
            serde_json::Value::Object(filtered)
        }
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use serde_json::json;

    use super::filter_custom_fields;

    fn allowed(keys: &[&str]) -> HashSet<String> {
        keys.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn drops_stray_keys() {
        let raw = json!({ "custom_1": "abc", "stray": "xyz" });
        let allowed = allowed(&["custom_1"]);
        assert_eq!(filter_custom_fields(raw, &allowed), json!({ "custom_1": "abc" }));
    }

    #[test]
    fn keeps_all_when_all_allowed() {
        let raw = json!({ "a": 1, "b": 2 });
        let allowed = allowed(&["a", "b"]);
        assert_eq!(filter_custom_fields(raw.clone(), &allowed), raw);
    }

    #[test]
    fn empty_object_when_nothing_allowed() {
        let raw = json!({ "a": 1 });
        let allowed = allowed(&[]);
        assert_eq!(filter_custom_fields(raw, &allowed), json!({}));
    }

    #[test]
    fn passes_through_non_object() {
        // Defensive — writes go through Map-shaped builders, but if a non-object
        // ever sits in the column we don't want to silently drop it.
        let raw = json!("just a string");
        let allowed = allowed(&["anything"]);
        assert_eq!(filter_custom_fields(raw.clone(), &allowed), raw);
    }
}
