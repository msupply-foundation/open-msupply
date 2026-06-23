use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use graphql_core::loader::{PropertyOptionsV2ByPropertyIdLoader, PropertyScopesV2ByPropertyIdLoader};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use repository::{
    PropertyDisplayModeV2, PropertyOptionV2Row, PropertyTableV2Row, PropertyV2, PropertyV2Row,
};
use serde::Serialize;
use service::ListResult;

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PropertyNodeValueTypeV2 {
    Number,
    Text,
    Date,
    Real,
    Option,
    Boolean,
    /// A value type configured on a newer central that this site doesn't yet
    /// recognise (the repository enum's `Other(String)` catch-all). Clients
    /// should treat it as opaque, e.g. render as read-only text. Mapped
    /// manually rather than via `#[graphql(remote)]` because the GraphQL enum
    /// can't carry the captured string payload.
    Other,
}

impl From<repository::PropertyValueTypeV2> for PropertyNodeValueTypeV2 {
    fn from(value: repository::PropertyValueTypeV2) -> Self {
        use repository::PropertyValueTypeV2 as RepoType;
        match value {
            RepoType::Number => Self::Number,
            RepoType::Text => Self::Text,
            RepoType::Date => Self::Date,
            RepoType::Real => Self::Real,
            RepoType::Option => Self::Option,
            RepoType::Boolean => Self::Boolean,
            RepoType::Other(_) => Self::Other,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PropertyNodeDisplayModeV2 {
    /// Not shown on this scope.
    Hidden,
    /// Shown wherever the scope lists its properties (e.g. the Properties tab).
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

impl From<PropertyDisplayModeV2> for PropertyNodeDisplayModeV2 {
    fn from(value: PropertyDisplayModeV2) -> Self {
        match value {
            PropertyDisplayModeV2::Hidden => Self::Hidden,
            PropertyDisplayModeV2::Visible => Self::Visible,
            PropertyDisplayModeV2::Prominent => Self::Prominent,
            PropertyDisplayModeV2::Other(_) => Self::Other,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct PropertyV2Node {
    pub property: PropertyV2Row,
    /// Per-scope display mode — only set when the property was queried with a
    /// single `table_name` filter (otherwise `None`).
    pub display_mode: Option<PropertyDisplayModeV2>,
}

#[derive(PartialEq, Debug)]
pub struct PropertyOptionV2Node {
    pub option: PropertyOptionV2Row,
}

#[derive(SimpleObject)]
pub struct PropertyV2Connector {
    pub total_count: u32,
    pub nodes: Vec<PropertyV2Node>,
}

#[derive(Union)]
pub enum PropertiesV2Response {
    Response(PropertyV2Connector),
}

#[Object]
impl PropertyV2Node {
    pub async fn id(&self) -> &str {
        &self.property.id
    }
    pub async fn key(&self) -> &str {
        &self.property.key
    }
    pub async fn name(&self) -> &str {
        &self.property.name
    }
    pub async fn value_type(&self) -> PropertyNodeValueTypeV2 {
        PropertyNodeValueTypeV2::from(self.property.value_type.clone())
    }
    pub async fn is_legacy(&self) -> bool {
        self.property.kind == repository::PropertyKindV2::Legacy
    }

    /// How prominently this property is shown on the queried table scope
    /// (`null` when the query wasn't scoped to a single `tableName`). Clients
    /// promote `PROMINENT` properties to the record's primary surface, e.g. the
    /// invoice detail-view toolbar.
    pub async fn display_mode(&self) -> Option<PropertyNodeDisplayModeV2> {
        self.display_mode
            .as_ref()
            .map(|mode| PropertyNodeDisplayModeV2::from(mode.clone()))
    }

    /// Options for OPTION-type properties. Empty list for any other value
    /// type. Resolved via dataloader so a list of N properties triggers a
    /// single batched lookup.
    pub async fn options(&self, ctx: &Context<'_>) -> Result<Vec<PropertyOptionV2Node>> {
        let loader = ctx.get_loader::<DataLoader<PropertyOptionsV2ByPropertyIdLoader>>();
        let options = loader
            .load_one(self.property.id.clone())
            .await
            .map_err(StandardGraphqlError::from_repository_error)?
            .unwrap_or_default();
        Ok(options.into_iter().map(PropertyOptionV2Node::from_domain).collect())
    }

    /// Every table scope this property is associated with, and how it's
    /// displayed on each (`HIDDEN`/`VISIBLE`/`PROMINENT`). Includes hidden
    /// scopes — the admin "Manage properties" config UI lists all associations
    /// so they can be changed. The absence of an entry for a `tableName` means
    /// the property is *not associated* with that scope at all (which is
    /// distinct from being associated-but-hidden: associated properties still
    /// transfer between records). Resolved via dataloader so a list of N
    /// properties triggers a single batched lookup.
    pub async fn scopes(&self, ctx: &Context<'_>) -> Result<Vec<PropertyScopeV2Node>> {
        let loader = ctx.get_loader::<DataLoader<PropertyScopesV2ByPropertyIdLoader>>();
        let scopes = loader
            .load_one(self.property.id.clone())
            .await
            .map_err(StandardGraphqlError::from_repository_error)?
            .unwrap_or_default();
        Ok(scopes.into_iter().map(PropertyScopeV2Node::from_domain).collect())
    }
}

#[Object]
impl PropertyOptionV2Node {
    pub async fn id(&self) -> &str {
        &self.option.id
    }
    pub async fn property_id(&self) -> &str {
        &self.option.property_id
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

/// One `property_table_v2` row — the association between a property and a table
/// scope, carrying the per-scope `displayMode`. Exposed via `PropertyV2Node.scopes`.
#[derive(PartialEq, Debug)]
pub struct PropertyScopeV2Node {
    pub scope: PropertyTableV2Row,
}

#[Object]
impl PropertyScopeV2Node {
    pub async fn id(&self) -> &str {
        &self.scope.id
    }
    pub async fn property_id(&self) -> &str {
        &self.scope.property_id
    }
    pub async fn table_name(&self) -> &str {
        &self.scope.table_name
    }
    pub async fn display_mode(&self) -> PropertyNodeDisplayModeV2 {
        PropertyNodeDisplayModeV2::from(self.scope.display_mode.clone())
    }
}

impl PropertyV2Node {
    pub fn from_domain(property: PropertyV2) -> PropertyV2Node {
        PropertyV2Node {
            property: property.property,
            display_mode: property.display_mode,
        }
    }
}

impl PropertyOptionV2Node {
    pub fn from_domain(option: PropertyOptionV2Row) -> PropertyOptionV2Node {
        PropertyOptionV2Node { option }
    }
}

impl PropertyScopeV2Node {
    pub fn from_domain(scope: PropertyTableV2Row) -> PropertyScopeV2Node {
        PropertyScopeV2Node { scope }
    }
}

impl PropertyV2Connector {
    pub fn from_domain(result: ListResult<PropertyV2>) -> PropertyV2Connector {
        PropertyV2Connector {
            total_count: result.count,
            nodes: result.rows.into_iter().map(PropertyV2Node::from_domain).collect(),
        }
    }
}

/// Filters a raw `properties_v2` JSONB blob down to keys allowed for a given
/// table. Stray keys (not defined in `property_v2`, soft-deleted, or with a
/// `property_table_v2.display_mode = HIDDEN`) are dropped. Non-object JSON is
/// returned untouched — that shape isn't expected, but better than silently
/// dropping data.
pub fn filter_properties_v2(
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

    use super::filter_properties_v2;

    fn allowed(keys: &[&str]) -> HashSet<String> {
        keys.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn drops_stray_keys() {
        let raw = json!({ "custom_1": "abc", "stray": "xyz" });
        let allowed = allowed(&["custom_1"]);
        assert_eq!(filter_properties_v2(raw, &allowed), json!({ "custom_1": "abc" }));
    }

    #[test]
    fn keeps_all_when_all_allowed() {
        let raw = json!({ "a": 1, "b": 2 });
        let allowed = allowed(&["a", "b"]);
        assert_eq!(filter_properties_v2(raw.clone(), &allowed), raw);
    }

    #[test]
    fn empty_object_when_nothing_allowed() {
        let raw = json!({ "a": 1 });
        let allowed = allowed(&[]);
        assert_eq!(filter_properties_v2(raw, &allowed), json!({}));
    }

    #[test]
    fn passes_through_non_object() {
        // Defensive — writes go through Map-shaped builders, but if a non-object
        // ever sits in the column we don't want to silently drop it.
        let raw = json!("just a string");
        let allowed = allowed(&["anything"]);
        assert_eq!(filter_properties_v2(raw.clone(), &allowed), raw);
    }
}
