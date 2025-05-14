use async_graphql::*;
use repository::StorageConnection;
use service::preference::{
    preferences::PreferenceProvider, PrefKey, Preference, PreferenceDescription, PreferenceType,
    PreferenceValueType,
};

pub struct PreferencesNode {
    pub connection: StorageConnection,
    pub store_id: Option<String>,
    pub preferences: PreferenceProvider,
}

#[Object]
impl PreferencesNode {
    pub async fn show_contact_tracing(&self) -> Result<bool> {
        self.load_preference(&self.preferences.show_contact_tracing)
    }

    pub async fn display_population_based_forecasting(&self) -> Result<bool> {
        self.load_preference(&self.preferences.display_population_based_forecasting)
    }

    pub async fn display_vaccine_in_doses(&self) -> Result<bool> {
        self.load_preference(&self.preferences.display_vaccine_in_doses)
    }

    pub async fn manage_vvm_status(&self) -> Result<bool> {
        self.load_preference(&self.preferences.manage_vvm_status)
    }

    pub async fn sort_by_vvm_status(&self) -> Result<bool> {
        self.load_preference(&self.preferences.sort_by_vvm_status)
    }
}

impl PreferencesNode {
    pub fn from_domain(
        connection: StorageConnection,
        store_id: Option<String>,
        prefs: PreferenceProvider,
    ) -> PreferencesNode {
        PreferencesNode {
            connection,
            store_id,
            preferences: prefs,
        }
    }

    pub fn load_preference<T>(&self, pref: &impl Preference<Value = T>) -> Result<T> {
        let result = pref.load(&self.connection, self.store_id.clone())?;
        Ok(result)
    }
}

pub struct PreferenceDescriptionNode {
    pub pref: PreferenceDescription,
}

#[Object]
impl PreferenceDescriptionNode {
    pub async fn key(&self) -> PreferenceKey {
        PreferenceKey::from_domain(&self.pref.key)
    }

    pub async fn value_type(&self) -> PreferenceValueNodeType {
        PreferenceValueNodeType::from_domain(&self.pref.value_type)
    }

    /// WARNING: Type loss - holds any kind of pref value (for edit UI).
    /// Use the PreferencesNode to load the strictly typed value.
    pub async fn value(&self) -> &serde_json::Value {
        &self.pref.value
    }
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
#[graphql(rename_items = "camelCase")]
pub enum PreferenceKey {
    // These keys (once camelCased) should match fields of PreferencesNode
    ShowContactTracing,
    DisplayVaccineInDoses,
    DisplayPopulationBasedForecasting,
    ManageVvmStatus,
    SortByVvmStatus,
}

impl PreferenceKey {
    pub fn from_domain(pref_key: &PrefKey) -> Self {
        match pref_key {
            PrefKey::ShowContactTracing => PreferenceKey::ShowContactTracing,
            PrefKey::DisplayPopulationBasedForecasting => {
                PreferenceKey::DisplayPopulationBasedForecasting
            }
            PrefKey::DisplayVaccineInDoses => PreferenceKey::DisplayVaccineInDoses,
            PrefKey::ManageVvmStatus => PreferenceKey::ManageVvmStatus,
            PrefKey::SortByVvmStatus => PreferenceKey::SortByVvmStatus,
        }
    }
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
pub enum PreferenceNodeType {
    Global,
    Store,
}

impl PreferenceNodeType {
    pub fn to_domain(self) -> PreferenceType {
        match self {
            PreferenceNodeType::Global => PreferenceType::Global,
            PreferenceNodeType::Store => PreferenceType::Store,
        }
    }
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
pub enum PreferenceValueNodeType {
    Boolean,
    Integer,
}

impl PreferenceValueNodeType {
    pub fn from_domain(domain_type: &PreferenceValueType) -> Self {
        match domain_type {
            PreferenceValueType::Boolean => PreferenceValueNodeType::Boolean,
            PreferenceValueType::Integer => PreferenceValueNodeType::Integer,
        }
    }
}
