use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ReceivePaymentsFromPrescriptions;

impl Preference for ReceivePaymentsFromPrescriptions {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ReceivePaymentsFromPrescriptions
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
