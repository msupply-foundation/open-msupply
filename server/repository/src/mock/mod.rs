use std::{collections::HashMap, ops::Index, vec};

mod activity_log;
pub mod asset;
pub mod asset_log;
mod barcode;
mod clinician;
pub mod common;
mod context;
mod document;
mod document_registry;
mod form_schema;
mod full_invoice;
mod full_master_list;
mod invoice;
mod invoice_line;
mod item;
mod location;
mod name;
mod name_store_join;
mod name_tag;
mod number;
mod pack_variant;
mod period_and_period_schedule;
mod program;
mod program_order_types;
mod program_requisition_settings;
mod sensor;
mod stock_line;
mod stocktake;
mod stocktake_line;
mod store;
mod temperature_breach;
mod temperature_breach_config;
mod temperature_log;
mod test_invoice_count_service;
mod test_invoice_loaders;
pub mod test_item_stats;
mod test_master_list_repository;
mod test_name_query;
mod test_name_store_id;
mod test_outbound_shipment_update;
pub mod test_remaining_to_supply;
mod test_remote_pull;
mod test_requisition_line_repository;
mod test_requisition_queries;
mod test_requisition_repository;
mod test_requisition_service;
mod test_service_lines;
mod test_stocktake;
mod test_stocktake_line;
mod test_unallocated_line;
mod unit;
mod user_account;

pub use asset::*;
pub use asset_log::*;
pub use barcode::*;
pub use clinician::*;
use common::*;
pub use context::*;
pub use document::*;
pub use document_registry::*;
pub use form_schema::*;
pub use full_invoice::*;
pub use full_master_list::*;
pub use invoice::*;
pub use invoice_line::*;
pub use item::*;
pub use location::*;
pub use name::*;
pub use name_store_join::*;
pub use name_tag::*;
pub use number::*;
pub use pack_variant::*;
pub use period_and_period_schedule::*;
pub use program::*;
pub use program_order_types::*;
pub use program_requisition_settings::*;
pub use sensor::*;
pub use stock_line::*;
pub use stocktake::*;
pub use stocktake_line::*;
pub use store::*;
pub use temperature_breach::*;
pub use temperature_breach_config::*;
pub use temperature_log::*;
pub use test_invoice_count_service::*;
pub use test_invoice_loaders::*;
pub use test_master_list_repository::*;
pub use test_name_query::*;
pub use test_name_store_id::*;
pub use test_outbound_shipment_update::*;
pub use test_remote_pull::*;
pub use test_requisition_line_repository::*;
pub use test_requisition_queries::*;
pub use test_requisition_repository::*;
pub use test_requisition_service::*;
pub use test_service_lines::*;
pub use test_stocktake::*;
pub use test_stocktake_line::*;
pub use test_unallocated_line::*;
pub use user_account::*;

use crate::{
    assets::{
        asset_log_row::{AssetLogRow, AssetLogRowRepository},
        asset_row::{AssetRow, AssetRowRepository},
    },
    ActivityLogRow, ActivityLogRowRepository, BarcodeRow, BarcodeRowRepository, ClinicianRow,
    ClinicianRowRepository, ClinicianStoreJoinRow, ClinicianStoreJoinRowRepository, ContextRow,
    ContextRowRepository, Document, DocumentRegistryRow, DocumentRegistryRowRepository,
    DocumentRepository, FormSchema, FormSchemaRowRepository, InventoryAdjustmentReasonRow,
    InventoryAdjustmentReasonRowRepository, InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow,
    ItemLinkRowRepository, ItemRow, KeyValueStoreRepository, KeyValueStoreRow, LocationRow,
    LocationRowRepository, MasterListNameJoinRepository, MasterListNameJoinRow, MasterListRow,
    MasterListRowRepository, NameLinkRow, NameLinkRowRepository, NameTagJoinRepository,
    NameTagJoinRow, NameTagRow, NameTagRowRepository, NumberRow, NumberRowRepository,
    PackVariantRow, PackVariantRowRepository, PeriodRow, PeriodRowRepository, PeriodScheduleRow,
    PeriodScheduleRowRepository, PluginDataRow, PluginDataRowRepository,
    ProgramRequisitionOrderTypeRow, ProgramRequisitionOrderTypeRowRepository,
    ProgramRequisitionSettingsRow, ProgramRequisitionSettingsRowRepository, ProgramRow,
    ProgramRowRepository, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    RequisitionRowRepository, SensorRow, SensorRowRepository, StockLineRowRepository,
    StocktakeLineRowRepository, StocktakeRowRepository, SyncBufferRow, SyncBufferRowRepository,
    SyncLogRow, SyncLogRowRepository, TemperatureBreachConfigRow,
    TemperatureBreachConfigRowRepository, TemperatureBreachRow, TemperatureBreachRowRepository,
    TemperatureLogRow, TemperatureLogRowRepository, UserAccountRow, UserAccountRowRepository,
    UserPermissionRow, UserPermissionRowRepository, UserStoreJoinRow, UserStoreJoinRowRepository,
};

use self::{activity_log::mock_activity_logs, unit::mock_units};

use super::{
    InvoiceRowRepository, ItemRowRepository, NameRow, NameRowRepository, NameStoreJoinRepository,
    NameStoreJoinRow, StockLineRow, StocktakeLineRow, StocktakeRow, StorageConnection, StoreRow,
    StoreRowRepository, UnitRow, UnitRowRepository,
};

#[derive(Default, Clone)]
pub struct MockData {
    pub user_accounts: Vec<UserAccountRow>,
    pub user_store_joins: Vec<UserStoreJoinRow>,
    pub user_permissions: Vec<UserPermissionRow>,
    pub names: Vec<NameRow>,
    pub name_links: Vec<NameLinkRow>,
    pub period_schedules: Vec<PeriodScheduleRow>,
    pub periods: Vec<PeriodRow>,
    pub stores: Vec<StoreRow>,
    pub units: Vec<UnitRow>,
    pub items: Vec<ItemRow>,
    pub locations: Vec<LocationRow>,
    pub sensors: Vec<SensorRow>,
    pub temperature_breaches: Vec<TemperatureBreachRow>,
    pub temperature_breach_configs: Vec<TemperatureBreachConfigRow>,
    pub temperature_logs: Vec<TemperatureLogRow>,
    pub name_store_joins: Vec<NameStoreJoinRow>,
    pub full_requisitions: Vec<FullMockRequisition>,
    pub invoices: Vec<InvoiceRow>,
    pub stock_lines: Vec<StockLineRow>,
    pub invoice_lines: Vec<InvoiceLineRow>,
    pub full_invoices: HashMap<String, FullMockInvoice>,
    pub full_master_lists: Vec<FullMockMasterList>,
    pub master_lists: Vec<MasterListRow>,
    pub master_list_name_joins: Vec<MasterListNameJoinRow>,
    pub numbers: Vec<NumberRow>,
    pub requisitions: Vec<RequisitionRow>,
    pub requisition_lines: Vec<RequisitionLineRow>,
    pub stocktakes: Vec<StocktakeRow>,
    pub stocktake_lines: Vec<StocktakeLineRow>,
    pub form_schemas: Vec<FormSchema>,
    pub documents: Vec<Document>,
    pub document_registries: Vec<DocumentRegistryRow>,
    pub sync_buffer_rows: Vec<SyncBufferRow>,
    pub key_value_store_rows: Vec<KeyValueStoreRow>,
    pub activity_logs: Vec<ActivityLogRow>,
    pub sync_logs: Vec<SyncLogRow>,
    pub name_tags: Vec<NameTagRow>,
    pub name_tag_joins: Vec<NameTagJoinRow>,
    pub inventory_adjustment_reasons: Vec<InventoryAdjustmentReasonRow>,
    pub program_requisition_settings: Vec<ProgramRequisitionSettingsRow>,
    pub programs: Vec<ProgramRow>,
    pub program_order_types: Vec<ProgramRequisitionOrderTypeRow>,
    pub barcodes: Vec<BarcodeRow>,
    pub clinicians: Vec<ClinicianRow>,
    pub clinician_store_joins: Vec<ClinicianStoreJoinRow>,
    pub contexts: Vec<ContextRow>,
    pub pack_variants: Vec<PackVariantRow>,
    pub plugin_data: Vec<PluginDataRow>,
    pub assets: Vec<AssetRow>,
    pub asset_logs: Vec<AssetLogRow>,
}

impl MockData {
    pub fn insert(&self, connection: &StorageConnection) {
        insert_mock_data(
            connection,
            MockDataInserts::all(),
            MockDataCollection {
                data: vec![("".to_string(), self.clone())],
            },
        );
    }
}

#[derive(Clone, Default, PartialEq)]
pub struct MockDataInserts {
    pub user_accounts: bool,
    pub user_store_joins: bool,
    pub user_permissions: bool,
    pub names: bool,
    pub name_tags: bool,
    pub name_tag_joins: bool,
    pub period_schedules: bool,
    pub periods: bool,
    pub stores: bool,
    pub units: bool,
    pub items: bool,
    pub locations: bool,
    pub sensors: bool,
    pub temperature_breaches: bool,
    pub temperature_breach_configs: bool,
    pub temperature_logs: bool,
    pub name_store_joins: bool,
    pub full_requisitions: bool,
    pub invoices: bool,
    pub stock_lines: bool,
    pub invoice_lines: bool,
    pub full_invoices: bool,
    pub full_master_lists: bool,
    pub numbers: bool,
    pub requisitions: bool,
    pub requisition_lines: bool,
    pub stocktakes: bool,
    pub stocktake_lines: bool,
    pub logs: bool,
    pub form_schemas: bool,
    pub documents: bool,
    pub document_registries: bool,
    pub sync_buffer_rows: bool,
    pub key_value_store_rows: bool,
    pub activity_logs: bool,
    pub sync_logs: bool,
    pub inventory_adjustment_reasons: bool,
    pub barcodes: bool,
    pub programs: bool,
    pub program_requisition_settings: bool,
    pub program_order_types: bool,
    pub clinicians: bool,
    pub clinician_store_joins: bool,
    pub contexts: bool,
    pub pack_variants: bool,
    pub plugin_data: bool,
    pub assets: bool,
    pub asset_logs: bool,
}

impl MockDataInserts {
    pub fn all() -> Self {
        MockDataInserts {
            user_accounts: true,
            user_store_joins: true,
            user_permissions: true,
            names: true,
            name_tags: true,
            name_tag_joins: true,
            period_schedules: true,
            periods: true,
            stores: true,
            units: true,
            items: true,
            locations: true,
            sensors: true,
            temperature_breaches: true,
            temperature_breach_configs: true,
            temperature_logs: true,
            name_store_joins: true,
            full_requisitions: true,
            invoices: true,
            stock_lines: true,
            invoice_lines: true,
            full_invoices: true,
            full_master_lists: true,
            numbers: true,
            requisitions: true,
            requisition_lines: true,
            stocktakes: true,
            stocktake_lines: true,
            logs: true,
            form_schemas: true,
            documents: true,
            document_registries: true,
            sync_buffer_rows: true,
            key_value_store_rows: true,
            activity_logs: true,
            sync_logs: true,
            inventory_adjustment_reasons: true,
            barcodes: true,
            programs: true,
            program_requisition_settings: true,
            program_order_types: true,
            clinicians: true,
            clinician_store_joins: true,
            contexts: true,
            pack_variants: true,
            plugin_data: true,
            assets: true,
            asset_logs: true,
        }
    }

    pub fn none() -> Self {
        MockDataInserts::default()
    }

    pub fn user_accounts(mut self) -> Self {
        self.user_accounts = true;
        self
    }

    pub fn user_store_joins(mut self) -> Self {
        self.user_store_joins = true;
        self
    }

    pub fn user_permissions(mut self) -> Self {
        self.user_permissions = true;
        self
    }

    pub fn names(mut self) -> Self {
        self.names = true;
        self
    }

    pub fn name_tags(mut self) -> Self {
        self.name_tags = true;
        self
    }

    pub fn name_tag_joins(mut self) -> Self {
        self.name_tag_joins = true;
        self
    }

    pub fn period_schedules(mut self) -> Self {
        self.period_schedules = true;
        self
    }

    pub fn periods(mut self) -> Self {
        self.periods = true;
        self
    }

    pub fn numbers(mut self) -> Self {
        self.numbers = true;
        self
    }

    pub fn stores(mut self) -> Self {
        self.names = true;
        self.stores = true;
        self
    }

    pub fn units(mut self) -> Self {
        self.units = true;
        self
    }

    pub fn items(mut self) -> Self {
        self.items = true;
        self
    }

    pub fn locations(mut self) -> Self {
        self.locations = true;
        self
    }

    pub fn sensors(mut self) -> Self {
        self.sensors = true;
        self
    }

    pub fn temperature_breaches(mut self) -> Self {
        self.temperature_breaches = true;
        self
    }

    pub fn temperature_breach_configs(mut self) -> Self {
        self.temperature_breach_configs = true;
        self
    }

    pub fn temperature_logs(mut self) -> Self {
        self.temperature_logs = true;
        self
    }

    pub fn name_store_joins(mut self) -> Self {
        self.name_store_joins = true;
        self
    }

    pub fn invoices(mut self) -> Self {
        self.invoices = true;
        self
    }

    pub fn requisitions(mut self) -> Self {
        self.requisitions = true;
        self
    }

    pub fn full_requisitions(mut self) -> Self {
        self.full_requisitions = true;
        self
    }

    pub fn stock_lines(mut self) -> Self {
        self.stock_lines = true;
        self
    }

    pub fn invoice_lines(mut self) -> Self {
        self.invoice_lines = true;
        self
    }

    pub fn full_invoices(mut self) -> Self {
        self.full_invoices = true;
        self
    }

    pub fn full_master_list(mut self) -> Self {
        self.full_master_lists = true;
        self
    }

    pub fn stocktakes(mut self) -> Self {
        self.stocktakes = true;
        self
    }

    pub fn stocktake_lines(mut self) -> Self {
        self.stocktake_lines = true;
        self
    }

    pub fn key_value_store_rows(mut self) -> Self {
        self.key_value_store_rows = true;
        self
    }

    pub fn activity_logs(mut self) -> Self {
        self.activity_logs = true;
        self
    }

    pub fn sync_logs(mut self) -> Self {
        self.sync_logs = true;
        self
    }

    pub fn inventory_adjustment_reasons(mut self) -> Self {
        self.inventory_adjustment_reasons = true;
        self
    }

    pub fn barcodes(mut self) -> Self {
        self.barcodes = true;
        self
    }

    pub fn programs(mut self) -> Self {
        self.programs = true;
        self
    }

    pub fn form_schemas(mut self) -> Self {
        self.form_schemas = true;
        self
    }

    pub fn documents(mut self) -> Self {
        self.documents = true;
        self
    }

    pub fn program_requisition_settings(mut self) -> Self {
        self.program_requisition_settings = true;
        self
    }

    pub fn program_order_types(mut self) -> Self {
        self.program_order_types = true;
        self
    }

    pub fn clinicians(mut self) -> Self {
        self.clinicians = true;
        self
    }

    pub fn clinician_store_joins(mut self) -> Self {
        self.clinician_store_joins = true;
        self
    }

    pub fn contexts(mut self) -> Self {
        self.contexts = true;
        self
    }

    pub fn pack_variants(mut self) -> Self {
        self.pack_variants = true;
        self
    }

    pub fn plugin_data(mut self) -> Self {
        self.plugin_data = true;
        self
    }

    pub fn assets(mut self) -> Self {
        self.names = true;
        self.stores = true;
        self.assets = true;
        self
    }

    pub fn asset_logs(mut self) -> Self {
        self.names = true;
        self.stores = true;
        self.assets = true;
        self.asset_logs = true;
        self
    }
}

#[derive(Default)]
pub struct MockDataCollection {
    // Note: can't use a HashMap since mock data should be inserted in order
    pub data: Vec<(String, MockData)>,
}

impl MockDataCollection {
    pub fn insert(&mut self, name: &str, data: MockData) {
        self.data.push((name.to_string(), data));
    }

    pub fn get_mut(&mut self, name: &str) -> &mut MockData {
        for (n, data) in &mut self.data {
            if n != name {
                continue;
            }
            return data;
        }
        unreachable!("Missing mock data");
    }
}

impl Index<&str> for MockDataCollection {
    type Output = MockData;

    fn index(&self, name: &str) -> &Self::Output {
        &self.data.iter().find(|entry| entry.0 == name).unwrap().1
    }
}

pub(crate) fn all_mock_data() -> MockDataCollection {
    let mut data: MockDataCollection = Default::default();
    data.insert(
        "base",
        MockData {
            user_accounts: mock_user_accounts(),
            user_store_joins: mock_user_store_joins(),
            user_permissions: mock_user_permissions(),
            names: mock_names(),
            name_links: mock_name_links(),
            name_tags: mock_name_tags(),
            period_schedules: mock_period_schedules(),
            periods: mock_periods(),
            stores: mock_stores(),
            units: mock_units(),
            items: mock_items(),
            locations: mock_locations(),
            sensors: mock_sensors(),
            temperature_logs: mock_temperature_logs(),
            temperature_breaches: mock_temperature_breaches(),
            temperature_breach_configs: mock_temperature_breach_configs(),
            name_store_joins: mock_name_store_joins(),
            invoices: mock_invoices(),
            stock_lines: mock_stock_lines(),
            invoice_lines: mock_invoice_lines(),
            full_invoices: mock_full_invoices(),
            full_master_lists: mock_full_master_lists(),
            numbers: mock_numbers(),
            stocktakes: mock_stocktake_data(),
            stocktake_lines: mock_stocktake_line_data(),
            form_schemas: mock_form_schemas(),
            documents: mock_documents(),
            document_registries: mock_document_registries(),
            activity_logs: mock_activity_logs(),
            programs: mock_programs(),
            program_requisition_settings: mock_program_requisition_settings(),
            program_order_types: mock_program_order_types(),
            name_tag_joins: mock_name_tag_joins(),
            contexts: mock_contexts(),
            pack_variants: mock_pack_variants(),
            clinicians: mock_clinicians(),
            assets: mock_assets(),
            asset_logs: mock_asset_logs(),
            ..Default::default()
        },
    );
    data.insert(
        "test_invoice_count_service_data",
        test_invoice_count_service_data(),
    );

    data.insert(
        "test_outbound_shipment_update_data",
        test_outbound_shipment_update_data(),
    );
    data.insert("test_stocktake_line_data", test_stocktake_line_data());
    data.insert("test_stocktake_data", test_stocktake_data());
    data.insert("mock_test_unallocated_line", mock_test_unallocated_line());
    data.insert("mock_test_name_store_id", mock_test_name_store_id());
    data.insert(
        "mock_test_requisition_repository",
        mock_test_requisition_repository(),
    );
    data.insert(
        "mock_test_requisition_line_repository",
        mock_test_requisition_line_repository(),
    );
    data.insert(
        "mock_test_requisition_service",
        mock_test_requisition_service(),
    );
    data.insert(
        "mock_test_requisition_queries",
        mock_test_requisition_queries(),
    );
    data.insert(
        "mock_test_master_list_repository",
        mock_test_master_list_repository(),
    );
    data.insert("mock_test_invoice_loaders", mock_test_invoice_loaders());
    data.insert("mock_test_remote_pull", mock_test_remote_pull());
    data.insert("mock_test_service_item", mock_test_service_item());
    data.insert("mock_test_name_query", mock_test_name_query());
    data
}

pub async fn insert_all_mock_data(
    connection: &StorageConnection,
    inserts: MockDataInserts,
) -> MockDataCollection {
    insert_mock_data(connection, inserts, all_mock_data())
}

pub fn insert_extra_mock_data(connection: &StorageConnection, extra_mock_data: MockData) {
    insert_mock_data(
        connection,
        MockDataInserts::all(),
        MockDataCollection {
            data: vec![("extra_data".to_string(), extra_mock_data)],
        },
    );
}

pub fn insert_mock_data(
    connection: &StorageConnection,
    inserts: MockDataInserts,
    mock_data: MockDataCollection,
) -> MockDataCollection {
    for (_, mock_data) in &mock_data.data {
        if inserts.names {
            let name_repo = NameRowRepository::new(connection);
            for row in &mock_data.names {
                name_repo.upsert_one(row).unwrap();
            }
            let name_link_repo = NameLinkRowRepository::new(connection);
            for row in &mock_data.name_links {
                name_link_repo.upsert_one(row).unwrap();
            }
        }

        if inserts.name_tags {
            let repo = NameTagRowRepository::new(connection);
            for row in &mock_data.name_tags {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.period_schedules {
            let repo = PeriodScheduleRowRepository::new(connection);
            for row in &mock_data.period_schedules {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.periods {
            let repo = PeriodRowRepository::new(connection);
            for row in &mock_data.periods {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.stores {
            let repo = StoreRowRepository::new(connection);
            for row in &mock_data.stores {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.user_accounts {
            let repo = UserAccountRowRepository::new(connection);
            for row in &mock_data.user_accounts {
                repo.insert_one(&row).unwrap();
            }
        }

        if inserts.user_store_joins {
            let repo = UserStoreJoinRowRepository::new(connection);
            for row in &mock_data.user_store_joins {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.contexts {
            let repo = ContextRowRepository::new(connection);
            for row in &mock_data.contexts {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.user_permissions {
            let repo = UserPermissionRowRepository::new(connection);
            for row in &mock_data.user_permissions {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.units {
            let repo = UnitRowRepository::new(connection);
            for row in &mock_data.units {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.items {
            let item_repo = ItemRowRepository::new(connection);
            let item_link_repo = ItemLinkRowRepository::new(connection);

            for row in &mock_data.items {
                item_repo.upsert_one(&row).unwrap();
                item_link_repo
                    .upsert_one(&mock_item_link_from_item(&row))
                    .unwrap();
            }
        }

        if inserts.locations {
            let repo = LocationRowRepository::new(connection);
            for row in &mock_data.locations {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.sensors {
            let repo = SensorRowRepository::new(connection);
            for row in &mock_data.sensors {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.temperature_breaches {
            let repo = TemperatureBreachRowRepository::new(connection);
            for row in &mock_data.temperature_breaches {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.temperature_breach_configs {
            let repo = TemperatureBreachConfigRowRepository::new(connection);
            for row in &mock_data.temperature_breach_configs {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.temperature_logs {
            let repo = TemperatureLogRowRepository::new(connection);
            for row in &mock_data.temperature_logs {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.name_store_joins {
            let repo = NameStoreJoinRepository::new(connection);
            for row in &mock_data.name_store_joins {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.full_requisitions {
            for row in mock_data.full_requisitions.iter() {
                insert_full_mock_requisition(&row, connection)
            }
        }

        if inserts.requisitions {
            for row in &mock_data.requisitions {
                let repo = RequisitionRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.requisition_lines {
            for row in &mock_data.requisition_lines {
                let repo = RequisitionLineRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.invoices {
            let repo = InvoiceRowRepository::new(connection);
            for row in &mock_data.invoices {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.stock_lines {
            let repo = StockLineRowRepository::new(connection);
            for row in &mock_data.stock_lines {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.invoice_lines {
            let repo = InvoiceLineRowRepository::new(connection);
            for row in &mock_data.invoice_lines {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.full_invoices {
            for row in mock_data.full_invoices.values() {
                insert_full_mock_invoice(row, connection)
            }
        }

        if inserts.full_master_lists {
            for row in mock_data.full_master_lists.iter() {
                insert_full_mock_master_list(row, connection)
            }
        }

        for row in &mock_data.master_lists {
            let repo = MasterListRowRepository::new(connection);
            repo.upsert_one(&row).unwrap();
        }

        for row in &mock_data.master_list_name_joins {
            let repo = MasterListNameJoinRepository::new(connection);
            repo.upsert_one(&row).unwrap();
        }

        if inserts.numbers {
            let repo = NumberRowRepository::new(connection);
            for row in &mock_data.numbers {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.stocktakes {
            let repo = StocktakeRowRepository::new(connection);
            for row in &mock_data.stocktakes {
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.stocktake_lines {
            let repo = StocktakeLineRowRepository::new(connection);
            for row in &mock_data.stocktake_lines {
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.sync_buffer_rows {
            let repo = SyncBufferRowRepository::new(connection);
            for row in &mock_data.sync_buffer_rows {
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.key_value_store_rows {
            let repo = KeyValueStoreRepository::new(connection);
            for row in &mock_data.key_value_store_rows {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.activity_logs {
            for row in &mock_data.activity_logs {
                let repo = ActivityLogRowRepository::new(connection);
                repo.insert_one(row).unwrap();
            }
        }

        if inserts.form_schemas {
            for row in &mock_data.form_schemas {
                let repo = FormSchemaRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.documents {
            for row in &mock_data.documents {
                let repo = DocumentRepository::new(connection);
                repo.insert(row).unwrap();
            }
        }

        if inserts.document_registries {
            for row in &mock_data.document_registries {
                let repo = DocumentRegistryRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.sync_logs {
            for row in &mock_data.sync_logs {
                let repo = SyncLogRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.inventory_adjustment_reasons {
            for row in &mock_data.inventory_adjustment_reasons {
                let repo = InventoryAdjustmentReasonRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.programs {
            for row in &mock_data.programs {
                let repo = ProgramRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.program_requisition_settings {
            for row in &mock_data.program_requisition_settings {
                let repo = ProgramRequisitionSettingsRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.program_order_types {
            for row in &mock_data.program_order_types {
                let repo = ProgramRequisitionOrderTypeRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.barcodes {
            for row in &mock_data.barcodes {
                let repo = BarcodeRowRepository::new(connection);
                repo.upsert_one(row).unwrap();
            }
        }

        if inserts.name_tag_joins {
            let repo = NameTagJoinRepository::new(connection);
            for row in &mock_data.name_tag_joins {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.clinicians {
            let repo = ClinicianRowRepository::new(connection);
            for row in &mock_data.clinicians {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.clinician_store_joins {
            let repo = ClinicianStoreJoinRowRepository::new(connection);
            for row in &mock_data.clinician_store_joins {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.pack_variants {
            let repo = PackVariantRowRepository::new(connection);
            for row in &mock_data.pack_variants {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.plugin_data {
            let repo = PluginDataRowRepository::new(connection);
            for row in &mock_data.plugin_data {
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.assets {
            for row in &mock_data.assets {
                let repo = AssetRowRepository::new(connection);
                repo.upsert_one(&row).unwrap();
            }
        }

        if inserts.asset_logs {
            let repo = AssetLogRowRepository::new(connection);
            for row in &mock_data.asset_logs {
                repo.upsert_one(&row).unwrap();
            }
        }
    }
    mock_data
}

impl MockData {
    pub fn join(mut self, other: MockData) -> MockData {
        let MockData {
            mut user_accounts,
            mut names,
            mut name_links,
            mut name_tags,
            mut period_schedules,
            mut periods,
            mut stores,
            mut units,
            mut items,
            mut locations,
            mut sensors,
            mut temperature_breaches,
            mut temperature_breach_configs,
            mut temperature_logs,
            mut name_store_joins,
            mut full_requisitions,
            mut invoices,
            mut stock_lines,
            mut invoice_lines,
            full_invoices: _,
            mut full_master_lists,
            mut numbers,
            mut requisitions,
            mut requisition_lines,
            mut stocktakes,
            mut stocktake_lines,
            user_store_joins: _,
            user_permissions: _,
            mut form_schemas,
            mut documents,
            mut document_registries,
            sync_buffer_rows: _,
            mut key_value_store_rows,
            mut activity_logs,
            mut sync_logs,
            mut inventory_adjustment_reasons,
            mut name_tag_joins,
            mut program_requisition_settings,
            mut programs,
            mut master_lists,
            mut master_list_name_joins,
            mut program_order_types,
            mut barcodes,
            mut clinicians,
            mut clinician_store_joins,
            mut contexts,
            mut pack_variants,
            mut assets,
            mut asset_logs,
            plugin_data: _,
        } = other;

        self.user_accounts.append(&mut user_accounts);
        self.names.append(&mut names);
        self.name_links.append(&mut name_links);
        self.name_tags.append(&mut name_tags);
        self.period_schedules.append(&mut period_schedules);
        self.periods.append(&mut periods);
        self.stores.append(&mut stores);
        self.units.append(&mut units);
        self.items.append(&mut items);
        self.locations.append(&mut locations);
        self.sensors.append(&mut sensors);
        self.temperature_logs.append(&mut temperature_logs);
        self.temperature_breaches.append(&mut temperature_breaches);
        self.temperature_breach_configs
            .append(&mut temperature_breach_configs);
        self.full_requisitions.append(&mut full_requisitions);
        self.invoices.append(&mut invoices);
        self.invoice_lines.append(&mut invoice_lines);
        // self.full_invoices.append(&mut full_invoices);
        self.full_master_lists.append(&mut full_master_lists);
        self.numbers.append(&mut numbers);
        self.requisitions.append(&mut requisitions);
        self.requisition_lines.append(&mut requisition_lines);
        self.stocktakes.append(&mut stocktakes);
        self.stocktake_lines.append(&mut stocktake_lines);
        self.name_store_joins.append(&mut name_store_joins);
        self.stock_lines.append(&mut stock_lines);
        self.form_schemas.append(&mut form_schemas);
        self.documents.append(&mut documents);
        self.document_registries.append(&mut document_registries);
        self.key_value_store_rows.append(&mut key_value_store_rows);
        self.activity_logs.append(&mut activity_logs);
        self.sync_logs.append(&mut sync_logs);
        self.inventory_adjustment_reasons
            .append(&mut inventory_adjustment_reasons);
        self.name_tag_joins.append(&mut name_tag_joins);
        self.program_requisition_settings
            .append(&mut program_requisition_settings);
        self.programs.append(&mut programs);
        self.master_lists.append(&mut master_lists);
        self.master_list_name_joins
            .append(&mut master_list_name_joins);
        self.program_order_types.append(&mut program_order_types);
        self.barcodes.append(&mut barcodes);
        self.clinicians.append(&mut clinicians);
        self.clinician_store_joins
            .append(&mut clinician_store_joins);
        self.contexts.append(&mut contexts);
        self.pack_variants.append(&mut pack_variants);
        self.assets.append(&mut assets);
        self.asset_logs.append(&mut asset_logs);

        self
    }
}
