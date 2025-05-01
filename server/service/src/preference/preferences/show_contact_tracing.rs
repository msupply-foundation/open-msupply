use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ShowContactTracing;

impl Preference for ShowContactTracing {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ShowContactTracing
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
