use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct InputVVMStatus;

impl Preference for InputVVMStatus {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::InputVVMStatus
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
