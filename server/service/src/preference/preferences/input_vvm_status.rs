use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct InputVvmStatus;

impl Preference for InputVvmStatus {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::InputVvmStatus
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
