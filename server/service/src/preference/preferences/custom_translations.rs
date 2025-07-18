use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct CustomTranslations;

impl Preference for CustomTranslations {
    type Value = serde_json::Value;

    fn key(&self) -> PrefKey {
        PrefKey::CustomTranslations
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    // Custom translations have a very custom frontend renderer
    // when editing, so we give it a very specific value type
    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::CustomTranslations
    }

    fn default_value(&self) -> Self::Value {
        serde_json::json!({})
    }

    // TODO: Implement custom upsert validation - and see about passing around a more explicit type that JSON Value?
}
