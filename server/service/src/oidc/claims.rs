//! Reading configured claims out of a verified ID token.
//!
//! Which claim carries the username and which carries the roles is deployment-specific (Keycloak
//! realm roles live in `realm_access.roles`, client roles in `resource_access.{client}.roles`, and
//! a mapper can put them anywhere), so both are addressed by a dotted path from config rather
//! than a fixed shape.

use serde_json::Value;

/// Resolve a dotted path such as `realm_access.roles` against the claim set.
///
/// Only object keys are traversed. A path segment that happens to contain a dot cannot be
/// addressed — acceptable for the claim names providers actually emit.
pub fn claim_by_path<'a>(claims: &'a Value, path: &str) -> Option<&'a Value> {
    let mut current = claims;
    for segment in path.split('.') {
        current = current.get(segment)?;
    }
    Some(current)
}

/// Read a claim expected to hold a single non-empty string.
pub fn string_claim(claims: &Value, path: &str) -> Option<String> {
    let value = claim_by_path(claims, path)?.as_str()?.trim();
    (!value.is_empty()).then(|| value.to_string())
}

/// Read the roles claim.
///
/// Accepts the three shapes seen in the wild: an array of strings (Keycloak's default), a single
/// space-separated string (the `scope`-style encoding some mappers produce), and a single plain
/// string. Anything else — including non-string array members — is ignored rather than failing the
/// login, so one malformed entry can't lock everyone out; the roles that do parse still apply.
pub fn roles_from_claim(claims: &Value, path: &str) -> Vec<String> {
    let Some(value) = claim_by_path(claims, path) else {
        return Vec::new();
    };

    let raw: Vec<&str> = match value {
        Value::Array(items) => items.iter().filter_map(|item| item.as_str()).collect(),
        // A single string may itself be a space-separated list.
        Value::String(single) => single.split_whitespace().collect(),
        _ => return Vec::new(),
    };

    let mut roles: Vec<String> = Vec::new();
    for role in raw {
        let role = role.trim();
        if role.is_empty() {
            continue;
        }
        // Providers can list the same role twice (e.g. a realm role also granted via a composite
        // role); duplicates would mean resolving the same template account repeatedly.
        if !roles.iter().any(|existing| existing == role) {
            roles.push(role.to_string());
        }
    }
    roles
}

/// Read the groups claim, normalising Keycloak's group paths to the group's own name.
///
/// Keycloak's *Group Membership* mapper emits full paths by default (`/pharmacy/dispensary`), and
/// plain names when "Full group path" is switched off (`dispensary`). Both are accepted, and both
/// reduce to the **last** segment — the group's own name — so the mSupply account a group maps to
/// doesn't depend on where the group sits in the provider's hierarchy.
///
/// Same shape tolerance as [`roles_from_claim`]: an array, a space-separated string, or a single
/// string. Empty and duplicate entries are dropped.
pub fn groups_from_claim(claims: &Value, path: &str) -> Vec<String> {
    let mut groups: Vec<String> = Vec::new();
    for raw in roles_from_claim(claims, path) {
        let name = raw.rsplit('/').next().unwrap_or_default().trim();
        if name.is_empty() {
            continue;
        }
        if !groups.iter().any(|existing| existing == name) {
            groups.push(name.to_string());
        }
    }
    groups
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn nested_claim_is_resolved_by_path() {
        let claims = json!({
            "preferred_username": "  jane  ",
            "realm_access": { "roles": ["dispensary", "stock_take"] },
            "resource_access": { "open-msupply": { "roles": ["admin"] } },
        });

        assert_eq!(
            string_claim(&claims, "preferred_username"),
            Some("jane".to_string()),
            "surrounding whitespace should be trimmed"
        );
        assert_eq!(
            roles_from_claim(&claims, "realm_access.roles"),
            vec!["dispensary".to_string(), "stock_take".to_string()]
        );
        assert_eq!(
            roles_from_claim(&claims, "resource_access.open-msupply.roles"),
            vec!["admin".to_string()]
        );
    }

    #[test]
    fn missing_or_unusable_claims_are_none() {
        let claims = json!({
            "preferred_username": "",
            "email": 42,
            "realm_access": { "roles": "not-an-array" },
        });

        assert_eq!(string_claim(&claims, "preferred_username"), None);
        assert_eq!(string_claim(&claims, "email"), None);
        assert_eq!(string_claim(&claims, "sub"), None);
        assert_eq!(string_claim(&claims, "realm_access.roles.deeper"), None);
    }

    #[test]
    fn roles_claim_accepts_a_space_separated_string() {
        let claims = json!({ "roles": "dispensary stock_take" });
        assert_eq!(
            roles_from_claim(&claims, "roles"),
            vec!["dispensary".to_string(), "stock_take".to_string()]
        );
    }

    #[test]
    fn roles_claim_skips_junk_and_deduplicates() {
        let claims = json!({ "roles": ["dispensary", "", 7, "dispensary", "  stock_take  "] });
        assert_eq!(
            roles_from_claim(&claims, "roles"),
            vec!["dispensary".to_string(), "stock_take".to_string()]
        );
    }

    #[test]
    fn group_paths_reduce_to_the_group_name() {
        // Keycloak's mapper default: full paths, leading slash and all.
        let claims = json!({ "groups": ["/dispensary", "/pharmacy/stock_take", "/"] });
        assert_eq!(
            groups_from_claim(&claims, "groups"),
            vec!["dispensary".to_string(), "stock_take".to_string()]
        );
    }

    #[test]
    fn plain_group_names_are_taken_as_they_are() {
        // "Full group path" switched off.
        let claims = json!({ "groups": ["dispensary", "stock_take"] });
        assert_eq!(
            groups_from_claim(&claims, "groups"),
            vec!["dispensary".to_string(), "stock_take".to_string()]
        );
    }

    #[test]
    fn groups_claim_deduplicates_after_normalising() {
        // Two paths, one group name — one candidate, not two.
        let claims = json!({ "groups": ["/a/dispensary", "/b/dispensary"] });
        assert_eq!(
            groups_from_claim(&claims, "groups"),
            vec!["dispensary".to_string()]
        );
    }

    #[test]
    fn a_nested_groups_claim_is_addressable() {
        let claims = json!({ "msupply": { "groups": ["/dispensary"] } });
        assert_eq!(
            groups_from_claim(&claims, "msupply.groups"),
            vec!["dispensary".to_string()]
        );
    }

    #[test]
    fn absent_groups_claim_yields_no_groups() {
        // The Group Membership mapper not being configured looks exactly like this.
        assert!(groups_from_claim(&json!({ "sub": "abc" }), "groups").is_empty());
    }

    #[test]
    fn absent_roles_claim_yields_no_roles() {
        let claims = json!({ "sub": "abc" });
        assert!(roles_from_claim(&claims, "realm_access.roles").is_empty());
        assert!(roles_from_claim(&claims, "sub.roles").is_empty());
    }
}
