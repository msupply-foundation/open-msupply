use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    sync::{Mutex, RwLock, RwLockReadGuard},
};

use actix_web::web::Data;
use extism::{
    convert::Json, host_fn, FromBytes, Manifest, Plugin, PluginBuilder, UserData, Wasm,
    WasmMetadata, PTR,
};
use repository::{raw_query, JsonRawRow};
use serde::{Deserialize, Serialize};

use crate::{
    item_stats::ItemStatsFilter,
    requisition::request_requisition::{
        SuggestedQuantity, SuggestedQuantityByItem, SuggestedQuantityInput,
    },
    service_provider::ServiceProvider,
};

#[derive(Clone, Deserialize, Serialize)]
pub struct AverageMonthlyConsumptionInput {
    pub store_id: String,
    pub amc_lookback_months: f64,
    pub filter: Option<ItemStatsFilter>,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct AverageMonthlyConsumptionItem {
    pub average_monthly_consumption: Option<f64>,
}

// Two types of plugins one to fetch one to use sql ? Default to normal calculation ?
pub type AverageMonthlyConsumptionByItem =
    HashMap<String /* itemId */, AverageMonthlyConsumptionItem>;
pub trait AverageMonthlyConsumption: Send + Sync {
    fn average_monthly_consumption(
        &self,
        input: AverageMonthlyConsumptionInput,
    ) -> AverageMonthlyConsumptionByItem;
}

#[derive(Default)]
pub struct Plugins {
    pub average_monthly_consumption: Option<Box<dyn AverageMonthlyConsumption>>,
    pub suggested_quantity: Option<Box<dyn SuggestedQuantity>>,
}

pub static PLUGINS: RwLock<Plugins> = RwLock::new(Plugins {
    average_monthly_consumption: None,
    suggested_quantity: None,
});

pub fn plugin<R, F: FnOnce(RwLockReadGuard<'_, Plugins>) -> R>(f: F) -> R {
    let plugins = PLUGINS.read().unwrap();

    f(plugins)
}

#[derive(Serialize, Debug, Deserialize, FromBytes)]
#[encoding(Json)]
struct WasmSqlQuery {
    statement: String,
    parameters: Vec<serde_json::Value>,
}

#[derive(Serialize, Debug, Deserialize, FromBytes)]
#[encoding(Json)]
struct WasmSqlResult {
    rows: Vec<serde_json::Value>,
}

host_fn!(sql(user_data: Data<ServiceProvider>; key: Json<WasmSqlQuery>) -> Json<WasmSqlResult> {
    Ok(wasm_sql(user_data, key))
});

fn wasm_sql(
    user_data: UserData<Data<ServiceProvider>>,
    Json(WasmSqlQuery { statement, .. }): Json<WasmSqlQuery>,
) -> Json<WasmSqlResult> {
    let data = user_data.get().unwrap();
    let service_provider = data.lock().unwrap();
    let connection = service_provider.connection().unwrap();
    let results = raw_query(&connection, statement);

    Json(WasmSqlResult {
        rows: results
            .into_iter()
            .map(|JsonRawRow { json_row }| {
                serde_json::from_str::<serde_json::Value>(&json_row).unwrap()
            })
            .collect(),
    })
}

struct PluginInstance(Mutex<Plugin>);

impl AverageMonthlyConsumption for PluginInstance {
    fn average_monthly_consumption(
        &self,
        input: AverageMonthlyConsumptionInput,
    ) -> AverageMonthlyConsumptionByItem {
        let mut plugin = self.0.lock().unwrap();
        serde_json::from_value(
            plugin
                .call::<serde_json::Value, serde_json::Value>(
                    "amc",
                    serde_json::to_value(&input).unwrap(),
                )
                .unwrap(),
        )
        .unwrap()
    }
}

impl SuggestedQuantity for PluginInstance {
    fn suggested_quantity(&self, input: SuggestedQuantityInput) -> SuggestedQuantityByItem {
        let mut plugin = self.0.lock().unwrap();
        serde_json::from_value(
            plugin
                .call::<serde_json::Value, serde_json::Value>(
                    "suggested_quantity",
                    serde_json::to_value(&input).unwrap(),
                )
                .unwrap(),
        )
        .unwrap()
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum PluginType {
    Amc,
    SuggestedQuantity,
}

#[derive(Deserialize, Clone, Debug)]
pub struct PluginConfig {
    allowed_hosts: Option<Vec<String>>,
    plugin_config: Option<serde_json::Value>,
}

pub fn bind_plugin(
    service_provider: Data<ServiceProvider>,
    wasm_location: PathBuf,
    plugin_type: &PluginType,
    PluginConfig {
        allowed_hosts,
        plugin_config,
    }: PluginConfig,
) {
    let manifest = Manifest::new([Wasm::Data {
        data: fs::read(wasm_location).unwrap(),
        meta: WasmMetadata {
            name: Some("commander".to_string()),
            hash: None,
        },
    }]);

    let manifest = match allowed_hosts {
        Some(hosts) => manifest.with_allowed_hosts(hosts.into_iter()),
        None => manifest,
    };

    let manifest = match plugin_config {
        Some(config) => manifest.with_config_key("config", serde_json::to_string(&config).unwrap()),
        None => manifest,
    };

    // Todo conditionally allow sql etc
    let plugin = PluginBuilder::new(manifest)
        .with_wasi(true)
        .with_function("sql", [PTR], [PTR], UserData::new(service_provider), sql)
        .build()
        .unwrap();

    let plugin_instance = PluginInstance(Mutex::new(plugin));

    match plugin_type {
        PluginType::Amc => {
            PLUGINS.write().unwrap().average_monthly_consumption = Some(Box::new(plugin_instance));
        }
        PluginType::SuggestedQuantity => {
            PLUGINS.write().unwrap().suggested_quantity = Some(Box::new(plugin_instance));
        }
    }
}
