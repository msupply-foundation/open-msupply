use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct WarnWhenMissingRecentStocktake;

#[derive(Default, Clone, Debug, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WarnWhenMissingRecentStocktakeData {
    pub enabled: bool,
    pub max_age: u32,   // Days
    pub min_items: u32, // Number of items to be considered a `full` stocktake
}

impl Preference for WarnWhenMissingRecentStocktake {
    type Value = WarnWhenMissingRecentStocktakeData;

    fn key(&self) -> PrefKey {
        PrefKey::WarnWhenMissingRecentStocktake
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::WarnWhenMissingRecentStocktakeData
    }
}
