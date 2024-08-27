use std::{collections::HashMap, fs };
use serde_yaml::Value;

use rust_embed::RustEmbed;

#[derive(RustEmbed)]
// Relative to server/Cargo.toml
// later this will be client in dev mode, or build in production mode
#[folder = "../../client/packages/host/dist"]
pub struct EmbeddedLocalisations;



// struct to manage translations
pub struct Localisations {
    pub translations: HashMap<String, HashMap<String, String>>,
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
        // Languages - need to extract these from the files themselves?
        let mut languages = Vec::new();

        // read all dirs within locales dir
        let folder_paths: Vec<String> = fs::read_dir("../client/packages/host/dist/locales")
            .unwrap()
            .filter_map(|e| e.ok())
            .map(|e: fs::DirEntry| e.path().as_os_str().to_string_lossy().to_string().split('/').last().unwrap().to_string())
            .collect();

        for path in folder_paths {
            languages.push(path)
        }

        for lang in languages {
            if let Some(content) = EmbeddedLocalisations::get(&format!("locales/{}/common.json", &lang)) {
                let json_data = content.data;
                let translations: HashMap<String, String> = serde_json::from_slice(&json_data).unwrap();
                self.translations.insert(lang.to_string(), translations);

            }
        }
        // later need to think about how to concatonate all translation json files per language

        Ok(())
    }

    // Get a translation for a given key and language
    pub fn get_translation(&self, key: &str, language: &str) -> String {
        self.translations
            .get(language)
            .and_then(|map| map.get(key))
            .cloned()
            .unwrap_or_else(|| "Translation not found".to_string())
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
