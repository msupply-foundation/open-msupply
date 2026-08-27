use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct RequisitionAutoFinalise;

impl Preference for RequisitionAutoFinalise {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::RequisitionAutoFinalise
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
