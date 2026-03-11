use crate::backend_plugin::{plugin_provider::PluginInstance, types::schedule};
use chrono::{Duration, NaiveDateTime, Utc};
use repository::{PluginType, RepositoryError};
use std::collections::HashMap;
use tokio::task::JoinHandle;
use util::format_error;

const SCHEDULE_PLUGIN_POLL_SECS: u64 = 60;

#[derive(Default)]
struct SchedulePluginRunner {
    next_run: HashMap<String, NaiveDateTime>,
}

impl SchedulePluginRunner {
    fn new() -> Self {
        Default::default()
    }

    fn run(&mut self) -> Result<(), RepositoryError> {
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

            let input = schedule::Input {};

            match schedule::Trait::call(&(*plugin), input) {
                Ok(output) => {
                    let next = now + Duration::seconds(output.next_poll_seconds as i64);
                    self.next_run.insert(plugin.code.clone(), next);
                }
                Err(e) => {
                    log::error!("Schedule plugin '{}': {}", plugin.code, format_error(&e));
                    self.next_run
                        .insert(plugin.code.clone(), now + Duration::seconds(60));
                }
            }
        }

        Ok(())
    }
}

pub fn spawn() -> JoinHandle<()> {
    tokio::spawn(async {
        let mut runner = SchedulePluginRunner::new();
        let mut interval =
            tokio::time::interval(std::time::Duration::from_secs(SCHEDULE_PLUGIN_POLL_SECS));
        loop {
            interval.tick().await;
            match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| runner.run())) {
                Ok(Ok(())) => log::info!("Schedule plugin runner complete"),
                Ok(Err(error)) => {
                    log::error!("Error running schedule plugins: {error:?}");
                }
                Err(panic) => {
                    log::error!("Schedule plugin runner panicked: {panic:?}");
                }
            }
        }
    })
}
