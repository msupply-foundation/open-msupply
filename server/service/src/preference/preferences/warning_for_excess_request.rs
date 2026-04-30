use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct WarningForExcessRequest;

impl Preference for WarningForExcessRequest {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::WarningForExcessRequest
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
