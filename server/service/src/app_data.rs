use std::{
    fs::File,
    io::{Error, Read, Write},
};

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Default)]
pub struct AppData {
    pub site_hardware_id: String,
}

const APP_DATA_FILE: &str = "settings_app_data.yaml";

impl AppData {
    pub fn load_from_file() -> Result<AppData, Error> {
        let mut file = File::open(APP_DATA_FILE)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        let app_data: AppData = serde_yaml::from_str(&contents).expect("Failed to parse app data");
        Ok(app_data)
    }

    pub fn is_empty(&self) -> bool {
        self.site_hardware_id.is_empty()
    }

    pub fn write_to_file(hardware_id: String) -> Result<Self, Error> {
        let mut app_data = AppData::load_from_file()?;
        if app_data.site_hardware_id.is_empty() {
            app_data.site_hardware_id = hardware_id;
            let mut file = File::create(APP_DATA_FILE)?;
            file.write_all(serde_yaml::to_string(&app_data).unwrap().as_bytes())?;
        }
        Ok(app_data)
    }
}
