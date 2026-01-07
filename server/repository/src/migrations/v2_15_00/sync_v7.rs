use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "sync_v7_"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE sync_log_v7 (
                id TEXT NOT NULL PRIMARY KEY,
                started_datetime {DATETIME} NOT NULL,
                finished_datetime {DATETIME},
                push_started_datetime {DATETIME},
                push_finished_datetime {DATETIME},
                push_progress_total INTEGER,
                push_progress_done INTEGER,
                pull_started_datetime {DATETIME},
                pull_finished_datetime {DATETIME},
                pull_progress_total INTEGER,
                pull_progress_done INTEGER,
                wait_for_integration_started_datetime {DATETIME},
                wait_for_integration_finished_datetime {DATETIME},
                integration_started_datetime {DATETIME},
                integration_finished_datetime {DATETIME},
                integration_progress_total INTEGER,
                integration_progress_done INTEGER,
                error {JSON}
            );

            CREATE TABLE sync_buffer_v7 (
                record_id TEXT NOT NULL PRIMARY KEY,
                received_datetime {DATETIME} NOT NULL,
                integration_datetime {DATETIME},
                integration_error TEXT,
                table_name TEXT NOT NULL,
                action TEXT NOT NULL,
                data {JSON} NOT NULL,
                name_id TEXT,
                store_id TEXT,
                source_site_id INTEGER
            );

            CREATE TABLE site (
                id INTEGER NOT NULL PRIMARY KEY,
                username TEXT NOT NULL,
                password_sha256 TEXT NOT NULL
            );
            "#,
        )?;

        Ok(())
    }
}
// cargo run -- --config-path ./configuration/central.yam
// yarn start -- -- --env API_HOST='http://localhost:8002' --port 3005
//insert into site (id, username, password_sha256) values (18, "test", "d74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1")
