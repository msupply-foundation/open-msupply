use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct CanCreateInternalOrderFromARequisition;

impl Preference for CanCreateInternalOrderFromARequisition {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::CanCreateInternalOrderFromARequisition
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
