use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct SortByVvmStatus;

impl Preference for SortByVvmStatus {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::SortByVvmStatus
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
