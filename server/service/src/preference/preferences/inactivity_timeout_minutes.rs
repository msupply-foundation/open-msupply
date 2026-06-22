use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct InactivityTimeoutMinutes;

impl Preference for InactivityTimeoutMinutes {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::InactivityTimeoutMinutes
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }

    fn default_value(&self) -> Self::Value {
        // matches old behaviour
        60
    }
}
