use std::collections::HashMap;
use serde_yaml::Value;

use rust_embed::RustEmbed;

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
#[folder = "../../client/packages/common/src/intl/locales"]
pub struct EmbeddedLocalisations;


// struct to manage translations
pub struct Localisations {
    pub translations: HashMap<String, HashMap<String, HashMap<String, String>>>,
}

pub struct TranslationStrings {
    pub translations: HashMap<String, Value>,
}

impl Localisations {

    // Creates a new Localisations struct
    pub fn new() -> Self {
        Localisations {
            translations: HashMap::new(),
        }
    }

    // Load translations from embedded files
    pub fn load_translations(&mut self) -> Result<(), std::io::Error> {
        // add read all namespace file names within locales
        for file in EmbeddedLocalisations::iter() {
                let file_namespace = file.split('/').nth(1).unwrap_or_default().to_string();
                let language = file.split('/').nth(0).unwrap_or_default().to_string();
                if let Some(content) = EmbeddedLocalisations::get(&file) {
                    let json_data = content.data;
                    let translations: HashMap<String, String> = serde_json::from_slice(&json_data).unwrap();
                    self.translations
                    .entry(language)
                    .or_insert_with(HashMap::new)
                    .insert(file_namespace, translations);
            }
        }
        Ok(())
    }

    // Get a translation for a given key and language
    // next need to add fallback and namespace to get Translation function
    pub fn get_translation(&self, key: &str, language: &str, namespace: &str, fallback: &str ) -> String {
        self.translations
            .get(language)
            .and_then(|map| map.get(namespace))
            .and_then(|map| map.get(key))
            .cloned()
            .unwrap_or_else(|| fallback.to_string())
    }
}

#[cfg(test)]
mod test {

use super::Localisations;


    #[test]
    fn test_translations() {
        let mut localisations = Localisations::new();
        // test loading localisations
        // note these translations might change if translations change in the front end. In this case, these will need to be updated.
        let _ = localisations.load_translations();
        // test correct translation
        let translated_value = localisations.get_translation("button.close", "fr", "common.json", "fallback");      
        assert_eq!("Fermer", translated_value);
        // test wrong key fallback
        let translated_value = localisations.get_translation("button.close-non-existent-key", "fr", "common.json", "fallback wrong key");      
        assert_eq!("fallback wrong key", translated_value);        
        // test wrong language dir
        let translated_value = localisations.get_translation("button.close", "non-existent-lang-dir", "common.json", "fallback wrong lang dir");      
        assert_eq!("fallback wrong lang dir", translated_value);
        // test wrong namespace
        let translated_value = localisations.get_translation("button.close", "fr", "common.json-non-existent", "fallback wrong namespace");      
        assert_eq!("fallback wrong namespace", translated_value);
    }
}
