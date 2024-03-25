use serde::{Deserialize, Serialize};
use std::{
    fs::File,
    io::{Error, Read, Write},
    path::{Path, PathBuf},
};

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Default)]
pub struct AppData {
    pub site_hardware_id: String,
}

const APP_DATA_FILE: &str = "settings_app_data.yaml";

pub trait AppDataServiceTrait: Send + Sync {
    fn get_app_data_directory(&self) -> Result<PathBuf, Error>;
    fn get_app_data_file(&self) -> Result<PathBuf, Error>;
    fn load_from_file(&self) -> Result<AppData, Error>;
    fn get_hardware_id(&self) -> Result<String, Error>;
    fn set_hardware_id(&self, hardware_id: String) -> Result<(), Error>;
}

pub struct AppDataService {
    pub app_data_folder: String,
}

impl AppDataService {
    pub fn new(app_data_folder: &str) -> Self {
        AppDataService {
            app_data_folder: app_data_folder.to_string(),
        }
    }
}

impl AppDataServiceTrait for AppDataService {
    fn get_app_data_directory(&self) -> Result<PathBuf, Error> {
        let root = Path::new("./");
        let app_data_folder = root.join(self.app_data_folder.clone());
        if !app_data_folder.exists() {
            std::fs::create_dir_all(app_data_folder.clone())?;
        }

        Ok(app_data_folder)
    }

    fn get_app_data_file(&self) -> Result<PathBuf, Error> {
        let app_data_directory = self.get_app_data_directory()?;

        Ok(app_data_directory.join(APP_DATA_FILE))
    }

    fn load_from_file(&self) -> Result<AppData, Error> {
        let file_path = self.get_app_data_file()?;

        if !file_path.exists() {
            let mut file = File::create(&file_path)?;
            file.write_all(b"site_hardware_id: \"\"")?;
        }

        let mut file = File::open(file_path)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        let app_data: AppData = serde_yaml::from_str(&contents).expect("Failed to parse app data");

        Ok(app_data)
    }

    fn get_hardware_id(&self) -> Result<String, Error> {
        let app_data = AppDataService::load_from_file(self)?;

        Ok(app_data.site_hardware_id)
    }

    fn set_hardware_id(&self, hardware_id: String) -> Result<(), Error> {
        let file_path = self.get_app_data_file()?;

        let mut app_data = AppDataService::load_from_file(self)?;
        app_data.site_hardware_id = hardware_id;
        let mut file = File::create(file_path)?;
        file.write_all(serde_yaml::to_string(&app_data).unwrap().as_bytes())?;

        Ok(())
    }
}
