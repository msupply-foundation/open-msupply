use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct PreventTransfersMonthsBeforeInitialisation;

impl Preference for PreventTransfersMonthsBeforeInitialisation {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::PreventTransfersMonthsBeforeInitialisation
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
