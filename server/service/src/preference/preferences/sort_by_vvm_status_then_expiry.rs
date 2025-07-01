use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct SortByVvmStatusThenExpiry;

impl Preference for SortByVvmStatusThenExpiry {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::SortByVvmStatusThenExpiry
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
