use std::{
    fs::File,
    io::{Error, Read, Write},
    path::PathBuf,
};

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Default)]
pub struct AppData {
    pub site_hardware_id: String,
}

impl AppData {
    pub fn is_empty(&self) -> bool {
        self.site_hardware_id.is_empty()
    }

    pub fn load_from_file(path: &PathBuf, hardware_id: String) -> Result<Self, Error> {
        let mut file = File::open(path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        let mut app_data: AppData =
            serde_yaml::from_str(&contents).expect("Failed to parse app data");
        if app_data.site_hardware_id.is_empty() {
            app_data.site_hardware_id = hardware_id;
            let mut file = File::create(path)?;
            file.write_all(serde_yaml::to_string(&app_data).unwrap().as_bytes())?;
        }
        Ok(app_data)
    }
}
