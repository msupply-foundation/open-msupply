use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct SecondThresholdForExpiringItems;

impl Preference for SecondThresholdForExpiringItems {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::SecondThresholdForExpiringItems
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
