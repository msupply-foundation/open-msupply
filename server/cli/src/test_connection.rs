use anyhow::{anyhow, Result};
use async_trait::async_trait;
use clap::Parser;
use log::*;
use repository::migrations::Version;
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use server::configuration;
use service::{
    apis::login_v4::{LoginApiV4, LoginInputV4, LoginUserTypeV4},
    app_data::{AppDataService, AppDataServiceTrait},
    sync::{
        api::{SyncApiSettings, SyncApiV5},
        api_v6::SyncApiV6,
    },
};
use tokio::sync::mpsc;

#[derive(Parser, Debug)]
struct Args {
    #[arg(short, long)]
    gui: bool,
    #[arg(short, long)]
    username: Option<String>,
    #[arg(short, long)]
    password: Option<String>,
    #[arg(short, long)]
    server_uuid: Option<String>,
}

#[tokio::main]
async fn main() {
    simple_logger::init_with_level(Level::Info).unwrap();

    let args = Args::parse();
    let gui = args.gui;

    let (gui_tx, gui_rc) = mpsc::channel(10);
    let test_task = tokio::spawn(perform_tests(gui_tx, args));

    if gui {
        let options = eframe::NativeOptions {
            viewport: egui::ViewportBuilder::default().with_inner_size([320.0, 240.0]),
            ..Default::default()
        };

        eframe::run_native(
            "OMS - Test Connections",
            options,
            Box::new(|cc| {
                egui_extras::install_image_loaders(&cc.egui_ctx); // This gives us image support
                Box::new(Gui::new(gui_rc))
            }),
        )
        .unwrap();
    }

    test_task.await.unwrap();
}

async fn perform_tests(gui_tx: mpsc::Sender<GuiState>, args: Args) {
    let gui = args.gui;
    let mut test_data = TestData {
        server_config: None,
        sync_api_v5: None,
        args,
    };

    let tests: Vec<Box<dyn Test + Send>> = vec![
        Box::new(ConfigTest),
        Box::new(PingTest),
        Box::new(LoginTest),
        Box::new(SyncTest),
        Box::new(SyncV6Test),
    ];

    let mut gui_state = GuiState {
        tests: vec![
            ("Config".to_string(), TestState::Pending),
            ("Ping".to_string(), TestState::Pending),
            ("Login".to_string(), TestState::Pending),
            ("Sync V5".to_string(), TestState::Pending),
            ("Sync V6".to_string(), TestState::Pending),
        ],
    };

    for i in 0..tests.len() {
        if gui {
            gui_state.tests[i].1 = TestState::Running;
            gui_tx.send(gui_state.clone()).await.unwrap();
        }

        let result = tests[i].run(&mut test_data).await;
        match &result {
            Ok(msg) => {
                info!("{} test passed: {}", gui_state.tests[i].0, msg);
            }
            Err(msg) => {
                error!("{} test failed: {}", gui_state.tests[i].0, msg);
            }
        }

        if gui {
            gui_state.tests[i].1 = match result {
                Ok(msg) => TestState::Success(msg),
                Err(msg) => TestState::Failure(msg.to_string()),
            };
            gui_tx.send(gui_state.clone()).await.unwrap();
        }
    }

    info!("All tests completed");
}

struct TestData {
    server_config: Option<service::settings::Settings>,
    sync_api_v5: Option<SyncApiV5>,
    args: Args,
}

#[async_trait]
trait Test {
    async fn run(&self, test_data: &mut TestData) -> Result<String>;
}

struct ConfigTest;

#[async_trait]
impl Test for ConfigTest {
    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        test_data.server_config = Some(
            configuration::get_configuration()
                .map_err(|err| anyhow!("Failed to load config: {:?}", err))?,
        );
        Ok("Successfully loaded config from {}".to_string())
    }
}

struct PingTest;

#[async_trait]
impl Test for PingTest {
    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded".to_string()))?;

        let url = get_url(config)?;

        info!("Pinging server at: {}", url.to_string());

        let response = reqwest::get(url)
            .await
            .map_err(|err| anyhow!("Failed to get response: {:?}", err))?;

        if response.status().is_success() {
            Ok("Successfully pinged server".to_string())
        } else {
            Err(anyhow!("Failed to ping server: {:?}", response))
        }
    }
}

struct LoginTest;

#[async_trait]
impl Test for LoginTest {
    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded".to_string()))?;

        let username = test_data
            .args
            .username
            .clone()
            .unwrap_or("admin".to_string());
        let password = test_data
            .args
            .password
            .clone()
            .unwrap_or("pass".to_string());
        let url = get_url(config)?;

        info!("Testing login at url: {}", url);
        info!("    Username: {}", username);
        info!("    Password: {}", password);

        let client = Client::new();
        let login_api = LoginApiV4::new(client, url);

        let login_input = LoginInputV4 {
            username,
            password,
            login_type: LoginUserTypeV4::User,
        };

        let _info = login_api
            .login(login_input)
            .await
            .map_err(|err| anyhow!("Failed to login: {:?}", err))?;

        Ok("Successfully logged in".to_string())
    }
}

struct SyncTest;

#[async_trait]
impl Test for SyncTest {
    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let config = &test_data
            .server_config
            .as_ref()
            .ok_or(anyhow!("No config loaded"))?;

        let v5_settings = config
            .sync
            .as_ref()
            .ok_or(anyhow!("No sync settings in config"))?;

        let server_folder = config
            .server
            .base_dir
            .clone()
            .ok_or(anyhow!("No server base dir in config"))?;

        let hardware_id = test_data.args.server_uuid.clone().unwrap_or(
            AppDataService::new(server_folder.as_str())
                .get_hardware_id()
                .map_err(|err| {
                    anyhow!("Failed to get hardware ID from app data service: {:?}", err)
                })?,
        );

        info!("Testing sync at url: {}", v5_settings.url);
        info!("    Username: {}", v5_settings.username);
        info!("    Password: {}", v5_settings.password_sha256);

        let sync_api_v5 = SyncApiV5::new(SyncApiSettings {
            server_url: v5_settings.url.clone(),
            username: v5_settings.username.clone(),
            password_sha256: v5_settings.password_sha256.clone(),
            site_uuid: hardware_id,
            sync_version: "5".to_string(),
            app_version: Version::from_package_json().to_string(),
            app_name: "Open mSupply Desktop".to_string(),
        })?;

        let _status = sync_api_v5
            .get_site_status()
            .await
            .map_err(|err| anyhow!("Failed to get site status from sync API V5: {:?}", err))?;

        test_data.sync_api_v5 = Some(sync_api_v5);

        Ok("Successfully connected to sync server".to_string())
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SiteInfoV5 {
    #[serde(rename = "omSupplyCentralServerUrl")]
    central_server_url: String,
    #[serde(rename = "isOmSupplyCentralServer")]
    is_central_server: bool,
}

struct SyncV6Test;

#[async_trait]
impl Test for SyncV6Test {
    async fn run(&self, test_data: &mut TestData) -> Result<String> {
        let sync_v5 = test_data
            .sync_api_v5
            .as_ref()
            .ok_or(anyhow!("No sync API V5"))?;

        let url = sync_v5
            .url
            .join("/sync/v5/site")
            .map_err(|err| anyhow!("Failed to join URL: {:?}", err))?;

        let v5_settings = test_data
            .server_config
            .as_ref()
            .and_then(|c| c.sync.as_ref())
            .ok_or(anyhow!("No sync settings in config"))?;

        let response = Client::new()
            .get(url.clone())
            .header("msupply-site-uuid", &sync_v5.settings.site_uuid)
            .header("app-version", &sync_v5.settings.app_version)
            .header("app-name", &sync_v5.settings.app_name)
            .header("version", &sync_v5.settings.sync_version)
            .basic_auth(&v5_settings.username, Some(&v5_settings.password_sha256))
            .send()
            .await
            .map_err(|err| anyhow!("Failed to send request: {:?}", err))?;

        let info_v5: SiteInfoV5 = response
            .json()
            .await
            .map_err(|err| anyhow!("Failed to parse response: {:?}", err))?;

        let v6_url = Url::parse(&info_v5.central_server_url)
            .map_err(|err| anyhow!("Failed to parse URL: {:?}", err))?;

        let sync_v6 = SyncApiV6::new(v6_url.as_str(), &sync_v5.settings, 1)
            .map_err(|err| anyhow!("Failed to create sync API V6: {:?}", err))?;

        let _status = sync_v6
            .get_site_status()
            .await
            .map_err(|err| anyhow!("Failed to get site status from sync API V6: {:?}", err))?;

        Ok("Successfully connected to sync server V6".to_string())
    }
}

#[derive(Clone, Default)]
struct GuiState {
    tests: Vec<(String, TestState)>,
}

struct Gui {
    gui_rc: mpsc::Receiver<GuiState>,
    state: GuiState,
}

impl Gui {
    fn new(gui_rc: mpsc::Receiver<GuiState>) -> Self {
        Self {
            gui_rc,
            state: GuiState::default(),
        }
    }
}

impl eframe::App for Gui {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("Open mSupply environment check");
            ui.separator();

            for (test_name, test_state) in &self.state.tests {
                test_state.display(ui, test_name);
            }

            ui.with_layout(egui::Layout::bottom_up(egui::Align::Center), |ui| {
                if ui.button("Done").clicked() {
                    std::process::exit(0);
                }
            });

            if let Ok(gui_state) = self.gui_rc.try_recv() {
                self.state = gui_state;
            }
        });
    }
}

#[derive(Clone, Debug)]
enum TestState {
    Pending,
    Running,
    Success(String),
    Failure(String),
}

impl TestState {
    fn display(&self, ui: &mut egui::Ui, name: &str) {
        match &self {
            TestState::Pending => {
                ui.horizontal_wrapped(|ui| {
                    ui.add(
                        egui::Image::new(egui::include_image!("assets/help_outline.png"))
                            .max_width(20.0),
                    );
                    ui.label(format!("Waiting to start {} test", name));
                });
            }
            TestState::Running => {
                ui.horizontal_wrapped(|ui| {
                    ui.add(egui::widgets::Spinner::default());
                    ui.label(format!("Running {} test", name));
                });
            }
            TestState::Success(msg) => {
                ui.horizontal_wrapped(|ui| {
                    ui.add(
                        egui::Image::new(egui::include_image!("assets/check_outline.png"))
                            .max_width(20.0),
                    );
                    ui.label(msg);
                });
            }
            TestState::Failure(msg) => {
                ui.horizontal_wrapped(|ui| {
                    ui.add(
                        egui::Image::new(egui::include_image!("assets/error_circle.png"))
                            .max_width(20.0),
                    );
                    ui.colored_label(egui::Color32::RED, msg);
                });
            }
        }
    }
}

fn get_url(config: &service::settings::Settings) -> Result<Url> {
    let address = config.server.address();
    let scheme = match config.server.danger_allow_http {
        true => "http",
        false => "https",
    };

    let url = Url::parse(&format!("{}://{}/", scheme, address)).map_err(|err| {
        anyhow!(
            "Failed to parse URL from server address: {} - {:?}",
            address,
            err
        )
    })?;

    Ok(url)
}
