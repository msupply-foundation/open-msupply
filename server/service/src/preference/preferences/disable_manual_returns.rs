use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct DisableManualReturns;

impl Preference for DisableManualReturns {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::DisableManualReturns
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
