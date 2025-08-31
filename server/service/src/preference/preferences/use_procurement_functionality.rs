use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct UseProcurementFunctionality;

impl Preference for UseProcurementFunctionality {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::UseProcurementFunctionality
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
