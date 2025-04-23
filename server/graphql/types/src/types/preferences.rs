use async_graphql::*;
use repository::{PreferenceRow, StorageConnection};
use service::preference::{preferences::PreferenceRegistry, Preference};

/// Defines the preferences object for a store
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

// Central only node types:

/// Describes a preference, how it is configured
pub struct PreferenceDescriptionNode {
    pub pref: Box<dyn Preference<Value = bool>>,
}

#[Object]
impl PreferenceDescriptionNode {
    pub async fn key(&self) -> &str {
        self.pref.key()
    }

    pub async fn json_schema(&self) -> serde_json::Value {
        self.pref.json_schema()
    }

    pub async fn ui_schema(&self) -> serde_json::Value {
        self.pref.ui_schema()
    }
}

pub struct PreferenceNode {
    pub preference: PreferenceRow,
}

#[Object]
impl PreferenceNode {
    pub async fn id(&self) -> &String {
        &self.preference.id
    }

    pub async fn key(&self) -> &String {
        &self.preference.key
    }

    /// JSON serialized value
    pub async fn value(&self) -> &String {
        &self.preference.value
    }

    pub async fn store_id(&self) -> Option<String> {
        self.preference.store_id.clone()
    }
}
