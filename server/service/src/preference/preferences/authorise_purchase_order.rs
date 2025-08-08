use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AuthorisePurchaseOrder;

impl Preference for AuthorisePurchaseOrder {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AuthorisePurchaseOrder
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
