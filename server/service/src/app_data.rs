use serde::{Deserialize, Serialize};
use std::io::Error;

use std::sync::RwLock;

// TODO relocate from app data service and remove app_data server
static HARDWARE_ID: RwLock<String> = RwLock::new(String::new());

// Should be called once in run_server
fn set_hardware_id(hardware_id: String) {
    (*HARDWARE_ID.write().unwrap()) = hardware_id;
}

fn get_hardware_id() -> String {
    HARDWARE_ID.read().unwrap().clone()
}

#[derive(Deserialize, Serialize, Clone, Debug, PartialEq, Default)]
pub struct AppData {
    pub site_hardware_id: String,
}

pub trait AppDataServiceTrait: Send + Sync {
    fn get_hardware_id(&self) -> Result<String, Error> {
        Ok(get_hardware_id())
    }
    fn set_hardware_id(&self, hardware_id: String) -> Result<(), Error> {
        Ok(set_hardware_id(hardware_id))
    }
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

impl AppDataServiceTrait for AppDataService {}
