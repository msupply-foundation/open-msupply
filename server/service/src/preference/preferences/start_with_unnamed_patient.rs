use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// Whether each new visit on the Simple screen starts with the unnamed patient chosen (spec/prescriptions rules › dispensing preferences). Set for every
/// store on the central server; a store may have its own value.
pub struct StartWithUnnamedPatient;

impl Preference for StartWithUnnamedPatient {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::StartWithUnnamedPatient
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn allows_store_override(&self) -> bool {
        true
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
