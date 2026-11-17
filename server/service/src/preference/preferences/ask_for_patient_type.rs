use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// Whether the Simple screen asks if the patient is an outpatient or an
/// inpatient (spec/prescriptions rules › dispensing preferences). Set for every
/// store on the central server; a store may have its own value.
pub struct AskForPatientType;

impl Preference for AskForPatientType {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AskForPatientType
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
