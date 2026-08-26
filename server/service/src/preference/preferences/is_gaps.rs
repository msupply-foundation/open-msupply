use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct IsGaps;

impl Preference for IsGaps {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::IsGaps
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
