use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// Whether the store can dispense to its unnamed patient (spec/prescriptions rules › dispensing preferences). Set for every
/// store on the central server; a store may have its own value.
pub struct UseUnnamedPatient;

impl Preference for UseUnnamedPatient {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::UseUnnamedPatient
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
