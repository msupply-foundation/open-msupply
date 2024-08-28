use std::{collections::HashMap };
use serde_yaml::Value;

use rust_embed::RustEmbed;

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
// later this will be client in dev mode, or build in production mode
#[folder = "../../client/packages/host/dist/locales"]
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

// #[cfg(test)]
// mod test {

// use super::Localisations;


//     #[test]
//     fn test_translations() {
//         let mut localisations = Localisations::new();
//         // test loading localisations...
//         let _ = localisations.load_translations();
//         let translated_value = localisations.get_translation("button.close", "fr");      
//         println!("{:?} translated value", translated_value);
//         // check translated file:
//         assert_eq!("Fermer", translated_value);
//     }
// }
