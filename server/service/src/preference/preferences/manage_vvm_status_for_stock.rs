use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ManageVvmStatusForStock;

impl Preference for ManageVvmStatusForStock {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ManageVvmStatusForStock
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
