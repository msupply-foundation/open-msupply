use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct FirstThresholdForExpiringItems;

impl Preference for FirstThresholdForExpiringItems {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::FirstThresholdForExpiringItems
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
