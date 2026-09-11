use chrono::{Duration, NaiveDateTime, Utc};
use repository::PluginType;
use service::backend_plugin::{plugin_provider::PluginInstance, types::schedule};
use std::collections::HashMap;
use tokio::task::JoinHandle;
use util::format_error;

const SCHEDULE_PLUGIN_POLL_SECS: u64 = 60;
/// How long to wait before retrying a plugin that errored or panicked.
const SCHEDULE_PLUGIN_ERROR_RETRY_SECS: i64 = 60;

#[derive(Default)]
struct SchedulePluginRunner {
    next_run: HashMap<String, NaiveDateTime>,
}

impl SchedulePluginRunner {
    fn new() -> Self {
        Default::default()
    }

    async fn run(&mut self) {
        let plugins = PluginInstance::get_all(PluginType::Schedule);
        let now = Utc::now().naive_utc();

        for plugin in plugins {
            let due = self
                .next_run
                .get(&plugin.code)
                .map(|t| now >= *t)
                .unwrap_or(true);

            if !due {
                continue;
            }

            // `call_async` runs the plugin (the whole boajs interpreter, plus any
            // `fetch`/`use_graphql` http calls it makes) on the blocking pool, so it doesn't
            // block the runtime. See runtime-blocking-demo and issue #11949.
            let next = match schedule::call_async(plugin.clone(), schedule::Input {}).await {
                Ok(output) => now + Duration::seconds(output.next_poll_seconds as i64),
                Err(e) => {
                    log::error!("Schedule plugin '{}': {}", plugin.code, format_error(&e));
                    now + Duration::seconds(SCHEDULE_PLUGIN_ERROR_RETRY_SECS)
                }
            };

            self.next_run.insert(plugin.code.clone(), next);
        }
    }
}

pub fn spawn() -> JoinHandle<()> {
    tokio::spawn(async {
        let mut runner = SchedulePluginRunner::new();
        let mut interval =
            tokio::time::interval(std::time::Duration::from_secs(SCHEDULE_PLUGIN_POLL_SECS));
        loop {
            interval.tick().await;
            runner.run().await;
            log::info!("Schedule plugin runner complete");
        }
    })
}
