use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ManageVaccinesInDoses;

impl Preference for ManageVaccinesInDoses {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ManageVaccinesInDoses
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
