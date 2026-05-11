use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct SelectDestinationStoreForAnInternalOrder;

impl Preference for SelectDestinationStoreForAnInternalOrder {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::SelectDestinationStoreForAnInternalOrder
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
