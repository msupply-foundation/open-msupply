use async_graphql::*;
use repository::StorageConnection;
use service::preference::{
    preferences::PreferenceRegistry, Preference, PreferenceDescription, PreferenceValueType,
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
    pub async fn key(&self) -> &str {
        &self.pref.key
    }

    pub async fn value_type(&self) -> PreferenceValueNodeType {
        PreferenceValueNodeType::from_domain(&self.pref.value_type)
    }
}

#[derive(Enum, Copy, Clone, Debug, Eq, PartialEq)]
pub enum PreferenceValueNodeType {
    Boolean,
    String,
    Integer,
}

impl PreferenceValueNodeType {
    pub fn from_domain(domain_type: &PreferenceValueType) -> Self {
        match domain_type {
            PreferenceValueType::Boolean => PreferenceValueNodeType::Boolean,
            PreferenceValueType::Integer => PreferenceValueNodeType::Integer,
            PreferenceValueType::String => PreferenceValueNodeType::String,
        }
    }
}
