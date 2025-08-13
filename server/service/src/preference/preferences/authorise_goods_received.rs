use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AuthoriseGoodsReceived;

impl Preference for AuthoriseGoodsReceived {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AuthoriseGoodsReceived
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
