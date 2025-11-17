use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct ExpiredStockPreventIssue;

impl Preference for ExpiredStockPreventIssue {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::ExpiredStockPreventIssue
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}

pub struct ExpiredStockIssueThreshold;

impl Preference for ExpiredStockIssueThreshold {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::ExpiredStockIssueThreshold
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
