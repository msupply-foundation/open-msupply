use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ExcludeTransfers;

impl Preference for ExcludeTransfers {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ExcludeTransfers
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
