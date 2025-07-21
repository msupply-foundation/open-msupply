use std::collections::HashMap;

use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct CustomTranslations;

impl Preference for CustomTranslations {
    type Value = HashMap<String, String>;

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
        HashMap::new()
    }
}
