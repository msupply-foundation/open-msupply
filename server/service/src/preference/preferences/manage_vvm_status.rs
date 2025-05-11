use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ManageVvmStatus;

impl Preference for ManageVvmStatus {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ManageVvmStatus
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
