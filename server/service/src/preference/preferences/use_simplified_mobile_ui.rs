use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct UseSimplifiedMobileUi;

impl Preference for UseSimplifiedMobileUi {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::UseSimplifiedMobileUi
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
