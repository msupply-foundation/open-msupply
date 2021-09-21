use crate::{
    database::repository::{
        CentralSyncBufferRepository, CentralSyncCursorRepository, SyncRepository,
    },
    server::data::RepositoryRegistry,
    util::sync::{
        translation::{import_sync_records, TRANSLATION_RECORDS},
        CentralSyncBatch, RemoteSyncBatch, RemoteSyncRecord, SyncConnection,
    },
};

use log::info;

pub struct Synchroniser {
    pub connection: SyncConnection,
}

#[allow(unused_assignments)]
impl Synchroniser {
    pub async fn pull_central_records(&mut self, registry: &RepositoryRegistry) {
        let central_sync_cursor_repository: &CentralSyncCursorRepository =
            registry.get::<CentralSyncCursorRepository>();

        let central_sync_buffer_repository: &CentralSyncBufferRepository =
            registry.get::<CentralSyncBufferRepository>();

        let mut cursor: u32 = central_sync_cursor_repository
            .get_cursor()
            .await
            .unwrap_or_else(|_| {
                info!("Initialising new central sync cursor...");
                0
            });

        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        loop {
            info!("Requesting central sync data...");
            let sync_batch: CentralSyncBatch = self
                .connection
                .central_records(cursor, BATCH_SIZE)
                .await
                .expect("Failed to pull central sync records");
            info!("Received central sync response");

            if let Some(central_sync_records) = sync_batch.data {
                for central_sync_record in central_sync_records {
                    central_sync_buffer_repository
                        .insert_one_and_update_cursor(&central_sync_record)
                        .await
                        .expect("Failed to insert central sync record into sync buffer");
                }
            }

            cursor = central_sync_cursor_repository
                .get_cursor()
                .await
                .expect("Failed to load central sync cursor");

            if cursor >= sync_batch.max_cursor - 1 {
                info!("All central sync records pulled successfully");
                break;
            }
        }
    }

    // Hacky method for pulling from sync_queue.
    pub async fn pull_remote_records(&mut self) -> Vec<RemoteSyncRecord> {
        // TODO: only initialize on initial sync.
        info!("Sending initialize request...");
        let mut sync_batch: RemoteSyncBatch = self
            .connection
            .initialize()
            .await
            .expect("Failed to initialize remote sync records");
        info!("Received initialize response");

        let mut records: Vec<RemoteSyncRecord> = Vec::new();
        while sync_batch.queue_length > 0 {
            info!("Sending remote sync request...");
            sync_batch = self
                .connection
                .remote_records()
                .await
                .expect("Failed to pull remote sync records");
            info!("Received remote sync response");

            // TODO: acknowledge after integration.
            if let Some(data) = sync_batch.data {
                records.append(&mut data.clone());
                info!("Acknowledging remote sync records...");
                self.connection
                    .acknowledge_records(&records)
                    .await
                    .expect("Failed to acknowledge remote sync records");
                info!("Acknowledged remote sync records");
            }
        }

        records
    }

    async fn integrate_central_records(&self, registry: &RepositoryRegistry) -> Result<(), String> {
        let central_sync_buffer_repository: &CentralSyncBufferRepository =
            registry.get::<CentralSyncBufferRepository>();
        let sync_session = registry
            .get::<SyncRepository>()
            .new_sync_session()
            .await
            .unwrap();
        for table_name in TRANSLATION_RECORDS {
            let buffer_rows = central_sync_buffer_repository
                .get_sync_entries(table_name)
                .await
                .map_err(|_| "Failed to read central sync entries".to_string())?;
            import_sync_records(&sync_session, &registry, &buffer_rows).await?;
        }
        central_sync_buffer_repository
            .remove_all()
            .await
            .map_err(|_| "Failed to empty central sync entries".to_string())?;
        Ok(())
    }

    fn integrate_remote_records(&self, records: Vec<RemoteSyncRecord>) {
        records.iter().for_each(|record| {
            info!("Integrated remote sync record {}", record.sync_id);
        });
    }

    pub async fn sync(&mut self, registry: &RepositoryRegistry) {
        info!("Syncing central records...");
        self.pull_central_records(registry).await;
        info!("Successfully synced central records");

        info!("Integrating central records...");
        self.integrate_central_records(registry)
            .await
            .expect("Failed to integrate central records");
        info!("Successfully integrated central records");

        info!("Syncing remote records...");
        let remote_records = self.pull_remote_records().await;
        info!("Successfully pulled remote records");

        info!("Integrating remote records...");
        self.integrate_remote_records(remote_records);
        info!("Successfully integrated remote records");
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        database::{
            repository::{get_repositories, CentralSyncBufferRepository},
            schema::CentralSyncBufferRow,
        },
        server::data::RepositoryRegistry,
        util::{
            configuration,
            settings::Settings,
            sync::{
                translation::test_data::{
                    check_records_against_database, extract_sync_buffer_rows,
                    item::get_test_item_records, master_list::get_test_master_list_records,
                    master_list_line::get_test_master_list_line_records,
                    master_list_name_join::get_test_master_list_name_join_records,
                    name::get_test_name_records, store::get_test_store_records,
                },
                SyncConnection, Synchroniser,
            },
            test_db,
        },
    };

    #[actix_rt::test]
    async fn test_integrate_central_records() {
        let settings: Settings =
            configuration::get_configuration().expect("Failed to parse configuration settings");

        let sync_connection = SyncConnection::new(&settings.sync);

        let settings = test_db::get_test_settings("omsupply-database-integrate_central_records");

        test_db::setup(&settings.database).await;

        let registry = RepositoryRegistry {
            repositories: get_repositories(&settings).await,
        };

        // use test records with cursors that are out of order
        let mut test_records = Vec::new();
        test_records.append(&mut get_test_name_records());
        test_records.append(&mut get_test_item_records());
        test_records.append(&mut get_test_store_records());
        test_records.append(&mut get_test_master_list_records());
        test_records.append(&mut get_test_master_list_name_join_records());
        test_records.append(&mut get_test_master_list_line_records());

        let central_records: Vec<CentralSyncBufferRow> = extract_sync_buffer_rows(&test_records);
        let central_sync_buffer_repository: &CentralSyncBufferRepository =
            &registry.get::<CentralSyncBufferRepository>();

        central_sync_buffer_repository
            .insert_many(&central_records)
            .await
            .expect("Failed to insert central sync records into sync buffer");

        let synchroniser = Synchroniser {
            connection: sync_connection,
        };

        synchroniser
            .integrate_central_records(&registry)
            .await
            .expect("Failed to integrate central records");

        check_records_against_database(&registry, test_records).await;
    }
}
