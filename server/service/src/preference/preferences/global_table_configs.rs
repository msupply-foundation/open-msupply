use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct GlobalTableConfigs;

impl Preference for GlobalTableConfigs {
    type Value = serde_json::Value;

    fn key(&self) -> PrefKey {
        PrefKey::GlobalTableConfigs
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::String
    }

    fn default_value(&self) -> Self::Value {
        serde_json::Value::Object(Default::default())
    }
}
