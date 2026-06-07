use std::collections::BTreeMap;

use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// Custom translations broken down by language and namespace.
///
/// Shape: `language -> namespace -> key -> value`
///
/// This is the v2 of [`super::CustomTranslations`]. The v1 flat preference is
/// kept up to date automatically (see `upsert_preferences`) so older sync
/// clients, which don't understand this preference key, keep working.
pub struct CustomTranslationsV2;

/// `language -> namespace -> key -> value`
pub type CustomTranslationsV2Value = BTreeMap<String, BTreeMap<String, BTreeMap<String, String>>>;

impl Preference for CustomTranslationsV2 {
    type Value = CustomTranslationsV2Value;

    fn key(&self) -> PrefKey {
        PrefKey::CustomTranslationsV2
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    // Custom translations have a very custom frontend renderer
    // when editing, so we give it a very specific value type
    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::CustomTranslationsV2
    }

    fn default_value(&self) -> Self::Value {
        BTreeMap::new()
    }
}

/// The default namespace, used when no namespace is specified.
pub const DEFAULT_NAMESPACE: &str = "common";

/// Flatten a single language's v2 translations (`namespace -> key -> value`)
/// into a flat `key -> value` map, suitable for the v1 preference (which is
/// namespace-agnostic). Non-default namespaces are inserted first, then the
/// default (`common`) namespace last, so `common` keys win on collision.
pub fn flatten_language_namespaces(
    namespaces: &BTreeMap<String, BTreeMap<String, String>>,
) -> BTreeMap<String, String> {
    let mut flat = BTreeMap::new();

    for (namespace, translations) in namespaces.iter() {
        if namespace == DEFAULT_NAMESPACE {
            continue;
        }
        for (key, value) in translations {
            flat.insert(key.clone(), value.clone());
        }
    }

    // common namespace last, so it wins on collision
    if let Some(translations) = namespaces.get(DEFAULT_NAMESPACE) {
        for (key, value) in translations {
            flat.insert(key.clone(), value.clone());
        }
    }

    flat
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flatten_language_namespaces() {
        let mut namespaces: BTreeMap<String, BTreeMap<String, String>> = BTreeMap::new();
        namespaces.insert(
            "common".to_string(),
            BTreeMap::from([
                ("button.close".to_string(), "Close".to_string()),
                ("shared.key".to_string(), "Common wins".to_string()),
            ]),
        );
        namespaces.insert(
            "report".to_string(),
            BTreeMap::from([
                ("report.title".to_string(), "Report".to_string()),
                ("shared.key".to_string(), "Report loses".to_string()),
            ]),
        );

        let flat = flatten_language_namespaces(&namespaces);

        assert_eq!(flat.get("button.close"), Some(&"Close".to_string()));
        assert_eq!(flat.get("report.title"), Some(&"Report".to_string()));
        // common namespace wins on collision
        assert_eq!(flat.get("shared.key"), Some(&"Common wins".to_string()));
    }
}
