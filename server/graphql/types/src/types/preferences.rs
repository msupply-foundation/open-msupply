use async_graphql::*;
use service::preference::preferences::{complex_pref::ComplexPref, Preferences};

pub struct PreferenceDescriptionNode {
    pub key: String,
    pub global_only: bool,
    pub json_forms_input_type: String,
}

#[Object]
impl PreferenceDescriptionNode {
    pub async fn key(&self) -> &String {
        &self.key
    }

    pub async fn global_only(&self) -> &bool {
        &self.global_only
    }

    pub async fn json_forms_input_type(&self) -> &String {
        &self.json_forms_input_type
    }
}

pub struct PreferencesNode {
    pub preferences: Preferences,
}

#[Object]
impl PreferencesNode {
    pub async fn show_contact_tracing(&self) -> &bool {
        &self.preferences.show_contact_tracing
    }

    pub async fn complex_pref(&self) -> ComplexPrefNode {
        ComplexPrefNode::from_domain(self.preferences.complex.clone())
    }
}

impl PreferencesNode {
    pub fn from_domain(prefs: Preferences) -> PreferencesNode {
        PreferencesNode { preferences: prefs }
    }
}

pub struct ComplexPrefNode {
    pub complex_pref: ComplexPref,
}

#[Object]
impl ComplexPrefNode {
    pub async fn something_here(&self) -> &i32 {
        &self.complex_pref.something_here
    }

    pub async fn something_else(&self) -> &String {
        &self.complex_pref.something_else
    }
}

impl ComplexPrefNode {
    pub fn from_domain(complex_pref: ComplexPref) -> ComplexPrefNode {
        ComplexPrefNode { complex_pref }
    }
}
