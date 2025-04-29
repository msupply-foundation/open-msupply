use crate::preference::{Preference, PreferenceType, PreferenceValueType};

pub struct DisplayPopulationBasedForecasting;

impl Preference for DisplayPopulationBasedForecasting {
    type Value = bool;

    fn key(&self) -> &'static str {
        "display_population_based_forecasting"
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
