use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct OrderInPacks;

impl Preference for OrderInPacks {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::OrderInPacks
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
