use anyhow::{anyhow, Result};
use async_trait::async_trait;
use log::info;
use repository::{get_storage_connection_manager, migrations::Version};
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use server::configuration;
use service::{
    apis::login_v4::{LoginApiV4, LoginInputV4, LoginUserTypeV4},
    app_data::{AppDataService, AppDataServiceTrait},
    email::{EmailService, EmailServiceError, EmailServiceTrait},
    service_provider::ServiceProvider,
    settings::is_develop,
    sync::{
        api::{SyncApiSettings, SyncApiV5},
        api_v6::SyncApiV6,
        settings::SyncSettings,
    },
};

pub struct TestCredentials {
    pub username: String,
    pub password: String,
}

pub struct TestData {
    pub server_config: Option<service::settings::Settings>,
    pub sync_api_v5: Option<SyncApiV5>,
    pub credentials: TestCredentials,
}

#[async_trait]
pub trait Test {
    fn name(&self) -> &str;
    async fn run(&self, test_data: &mut TestData) -> Result<String>;
}

#[derive(Clone, Debug)]
pub enum TestState {
    Pending,
    Running,
    Success(String),
    Failure(String),
}

pub struct ConfigTest;

#[async_trait]
impl Test for ConfigTest {
    fn name(&self) -> &str {
        "Config"
    }

    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        test_data.server_config = Some(
            configuration::get_configuration(configuration::ConfigArgs { config_path: None })
                .map_err(|err| anyhow!("Failed to load config: {err:?}"))?,
        );
        Ok("Successfully loaded configuration".to_string())
    }
}

pub struct PingTest;

#[async_trait]
impl Test for PingTest {
    fn name(&self) -> &str {
        "Ping"
    }

    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded".to_string()))?;

        let url = get_url(config)?;

        info!("Pinging server at: {}", url);

        let response = reqwest::get(url)
            .await
            .map_err(|err| anyhow!("Ping test: Failed to get response: {err:?}"))?;

        if response.status().is_success() {
            Ok("Successfully pinged server".to_string())
        } else {
            Err(anyhow!("Failed to ping server: {response:?}"))
        }
    }
}

pub struct DatabaseTest;

#[async_trait]
impl Test for DatabaseTest {
    fn name(&self) -> &str {
        "Database"
    }

    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded".to_string()))?;

        info!(
            "Testing database {} on server: {}",
            config.database.database_name, config.database.host
        );

        let connection_manager = get_storage_connection_manager(&config.database);
        let result = connection_manager.execute("select 1");

        if result.is_ok() {
            Ok("Successfully connected to database".to_string())
        } else {
            Err(anyhow!(
                "Failed to connect to database: {:?}",
                result.err().unwrap()
            ))
        }
    }
}

pub struct LoginTest;

#[async_trait]
impl Test for LoginTest {
    fn name(&self) -> &str {
        "Login"
    }

    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded".to_string()))?;

        let username = test_data.credentials.username.clone();
        let password = test_data.credentials.password.clone();
        let sync_settings = get_sync_settings(config)?;

        info!("Testing login at url: {}", sync_settings.url);
        info!("    Username: {username}");
        info!("    Password: {password}");

        let client = Client::new();
        let login_api = LoginApiV4::new(client, Url::parse(&sync_settings.url)?);

        let login_input = LoginInputV4 {
            username,
            password,
            login_type: LoginUserTypeV4::User,
            site_name: Some("null".to_string()),
        };

        let _info = login_api
            .login(login_input)
            .await
            .map_err(|err| anyhow!("Failed to login: {err:?}"))?;

        Ok("Successfully logged in".to_string())
    }
}

pub struct SyncTest;

#[async_trait]
impl Test for SyncTest {
    fn name(&self) -> &str {
        "Sync V5"
    }

    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded"))?;

        let v5_settings = get_sync_settings(config)?;

        let app_data_service = AppDataService {};

        let hardware_id = app_data_service
            .get_hardware_id()
            .map_err(|err| anyhow!("Failed to get hardware ID from app data service: {err:?}"))?;

        info!("Testing sync at url: {}", v5_settings.url);
        info!("    Username: {}", v5_settings.username);
        info!("    Password: {}", v5_settings.password_sha256);

        let sync_api_v5 = SyncApiV5::new(SyncApiSettings {
            server_url: v5_settings.url.clone(),
            username: v5_settings.username.clone(),
            password_sha256: v5_settings.password_sha256.clone(),
            site_uuid: hardware_id,
            sync_version: "7".to_string(),
            app_version: Version::from_package_json().to_string(),
            app_name: "Open mSupply Desktop".to_string(),
        })?;

        let _status = sync_api_v5
            .get_site_status()
            .await
            .map_err(|err| anyhow!("Failed to get site status from sync API V5: {err:?}"))?;

        test_data.sync_api_v5 = Some(sync_api_v5);

        Ok("Successfully connected to sync server".to_string())
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SiteInfoV5 {
    #[serde(rename = "omSupplyCentralServerUrl")]
    pub central_server_url: String,
    #[serde(rename = "isOmSupplyCentralServer")]
    pub is_central_server: bool,
}

pub struct SyncV6Test;

#[async_trait]
impl Test for SyncV6Test {
    fn name(&self) -> &str {
        "Sync V6"
    }

    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let sync_v5 = test_data
            .sync_api_v5
            .as_ref()
            .ok_or(anyhow!("No sync API V5"))?;

        let url = sync_v5
            .url
            .join("/sync/v5/site")
            .map_err(|err| anyhow!("Failed to join URL: {err:?}"))?;

        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded"))?;

        let v5_settings = get_sync_settings(config)?;

        let response = Client::new()
            .get(url.clone())
            .header("msupply-site-uuid", &sync_v5.settings.site_uuid)
            .header("app-version", &sync_v5.settings.app_version)
            .header("app-name", &sync_v5.settings.app_name)
            .header("version", &sync_v5.settings.sync_version)
            .basic_auth(&v5_settings.username, Some(&v5_settings.password_sha256))
            .send()
            .await
            .map_err(|err| anyhow!("Failed to send request: {err:?}"))?;

        let info_v5: SiteInfoV5 = response
            .json()
            .await
            .map_err(|err| anyhow!("Failed to parse response: {err:?}"))?;

        let v6_url = Url::parse(&info_v5.central_server_url)
            .map_err(|err| anyhow!("Failed to parse URL: {err:?}"))?;

        let sync_v6 = SyncApiV6::new(v6_url.as_str(), &sync_v5.settings, 1)
            .map_err(|err| anyhow!("Failed to create sync API V6: {err:?}"))?;

        let _status = sync_v6
            .get_site_status()
            .await
            .map_err(|err| anyhow!("Failed to get site status from sync API V6: {err:?}"))?;

        Ok("Successfully connected to sync server V6".to_string())
    }
}

pub struct MailConnectionTest;

#[async_trait]
impl Test for MailConnectionTest {
    fn name(&self) -> &str {
        "Mail connection"
    }

    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded".to_string()))?;

        info!("Testing mail connection");

        let email_service = EmailService::new(config.mail.clone());

        match email_service.test_connection() {
            Ok(true) => Ok("Successfully connected to mail server".to_string()),
            Ok(false) => Err(anyhow!("Failed to connect to mail server")),
            Err(EmailServiceError::NotConfigured) => Ok(
                "No mail settings found in configuration. Mail setup is only required on OMS Central server.".to_string(),
            ),
            Err(err) => Err(anyhow!("Failed to connect to mail server: {err:?}")),
        }
    }
}

pub fn all_tests() -> Vec<Box<dyn Test + Send>> {
    vec![
        Box::new(ConfigTest),
        Box::new(PingTest),
        Box::new(DatabaseTest),
        Box::new(LoginTest),
        Box::new(SyncTest),
        Box::new(SyncV6Test),
        Box::new(MailConnectionTest),
    ]
}

pub fn get_url(config: &service::settings::Settings) -> Result<Url> {
    let address = config.server.address().replace("0.0.0.0", "localhost");
    let scheme = match config.server.danger_allow_http | is_develop() {
        true => "http",
        false => "https",
    };

    let url = Url::parse(&format!("{scheme}://{address}/"))
        .map_err(|err| anyhow!("Failed to parse URL from server address: {address} - {err:?}"))?;

    Ok(url)
}

pub fn get_sync_settings(config: &service::settings::Settings) -> Result<SyncSettings> {
    let machine_uid = machine_uid::get().expect("Failed to query OS for hardware id");
    let connection_manager = get_storage_connection_manager(&config.database);
    let service_provider = ServiceProvider::new(connection_manager.clone());

    service_provider
        .app_data_service
        .set_hardware_id(machine_uid.clone())
        .unwrap();
    let service_context = service_provider.basic_context().unwrap();

    let yaml_sync_settings = config.sync.clone();
    let database_sync_settings = service_provider.settings.sync_settings(&service_context);

    let settings = match (yaml_sync_settings, database_sync_settings) {
        (Some(yaml), Ok(Some(database))) => {
            if database.core_site_details_changed(&yaml) {
                info!("Sync settings in configurations don't match database");
            }
            database
        }
        (Some(yaml), _) => yaml,
        (None, Ok(Some(database))) => database,
        (None, _) => return Err(anyhow!("No sync settings in config")),
    };

    Ok(settings)
}
