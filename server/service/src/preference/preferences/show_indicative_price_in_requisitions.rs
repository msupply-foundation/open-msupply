use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ShowIndicativePriceInRequisitions;

impl Preference for ShowIndicativePriceInRequisitions {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ShowIndicativePriceInRequisitions
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
