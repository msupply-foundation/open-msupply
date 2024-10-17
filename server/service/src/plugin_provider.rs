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

use crate::{item_stats::ItemStatsFilter, service_provider::ServiceProvider};

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
}

pub static PLUGINS: RwLock<Plugins> = RwLock::new(Plugins {
    average_monthly_consumption: None,
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

struct AMC(Mutex<Plugin>);

impl AverageMonthlyConsumption for AMC {
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

pub fn bind_plugin(service_provider: Data<ServiceProvider>, wasm_location: PathBuf) {
    let manifest = Manifest::new([Wasm::Data {
        data: fs::read(wasm_location).unwrap(),
        meta: WasmMetadata {
            name: Some("commander".to_string()),
            hash: None,
        },
    }]);
    let plugin = PluginBuilder::new(manifest)
        .with_wasi(true)
        .with_function("sql", [PTR], [PTR], UserData::new(service_provider), sql)
        .build()
        .unwrap();

    let amc = AMC(Mutex::new(plugin));

    PLUGINS.write().unwrap().average_monthly_consumption = Some(Box::new(amc));
}
