use async_graphql::*;
use repository::StorageConnection;
use service::preference::{
    preferences::PreferenceRegistry, Preference, PreferenceDescription, PreferenceType,
    PreferenceValueType,
};

pub struct PreferencesNode {
    pub connection: StorageConnection,
    pub store_id: Option<String>,
    pub preferences: PreferenceRegistry,
}

#[Object]
impl PreferencesNode {
    pub async fn show_contact_tracing(&self) -> Result<bool> {
        self.load_preference(&self.preferences.show_contact_tracing)
    }
}

impl PreferencesNode {
    pub fn from_domain(
        connection: StorageConnection,
        store_id: Option<String>,
        prefs: PreferenceRegistry,
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
    pub async fn key(&self) -> String {
        self.pref.key.to_string()
    }

    pub async fn value_type(&self) -> PreferenceValueNodeType {
        PreferenceValueNodeType::from_domain(&self.pref.value_type)
    }

    pub async fn value(&self) -> &serde_json::Value {
        &self.pref.value
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
