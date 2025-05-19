use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct UseSimplifiedMobileUI;

impl Preference for UseSimplifiedMobileUI {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::UseSimplifiedMobileUI
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
