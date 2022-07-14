use std::env;

use rand::{thread_rng, Rng};
use reqwest::{Client, Url};
use serde_json::json;
use util::{hash::sha256, uuid::uuid};

use crate::sync::{
    api::{SyncApiError, SyncApiV5},
    settings::SyncSettings,
    SyncCredentials,
};

impl SyncApiV5 {
    pub(crate) async fn upsert_central_records(
        &self,
        value: &serde_json::Value,
    ) -> Result<(), SyncApiError> {
        self.do_post("/sync/v5/test/upsert", value).await?;

        Ok(())
    }

    pub(crate) async fn delete_central_records(
        &self,
        value: &serde_json::Value,
    ) -> Result<(), SyncApiError> {
        self.do_post("/sync/v5/test/delete", value).await?;

        Ok(())
    }
}

pub(crate) struct ConfigureCentralServer {
    api: SyncApiV5,
    new_site_password: String,
    server_url: String,
}

pub(crate) struct CreateSyncSiteResult {
    pub(crate) new_site_properties: NewSiteProperties,
    pub(crate) sync_settings: SyncSettings,
}

impl ConfigureCentralServer {
    // SYNC_SITE_PASSWORD="pass" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" NEW_SITE_PASSWORD="pass" cargo test sync_integration_test --features integration_test
    // OR in VSCODE settings if using rust analyzer:
    // "rust-analyzer.runnableEnv": { "SYNC_URL": "http://localhost:2048", "SYNC_SITE_NAME": "demo","SYNC_SITE_PASSWORD": "pass", "NEW_SITE_PASSWORD": "pass"}
    // "rust-analyzer.cargo.features": ["integration_test"]
    pub(crate) fn from_env() -> ConfigureCentralServer {
        let password =
            env::var("SYNC_SITE_PASSWORD").expect("SYNC_SITE_PASSWORD env variable missing");
        let new_site_password =
            env::var("NEW_SITE_PASSWORD").expect("NEW_SITE_PASSWORD env variable missing");
        let site_name = env::var("SYNC_SITE_NAME").expect("SYNC_SITE_NAME env variable missing");
        let url = env::var("SYNC_URL").expect("SYNC_URL env variable missing");

        ConfigureCentralServer {
            api: SyncApiV5::new(
                Url::parse(&url).unwrap(),
                SyncCredentials {
                    username: site_name,
                    password_sha256: sha256(&password),
                },
                Client::new(),
                "",
            ),
            server_url: url,
            new_site_password,
        }
    }

    pub(crate) async fn upsert_records(&self, records: serde_json::Value) -> anyhow::Result<()> {
        Ok(self.api.upsert_central_records(&records).await?)
    }

    pub(crate) async fn delete_records(&self, records: serde_json::Value) -> anyhow::Result<()> {
        Ok(self.api.delete_central_records(&records).await?)
    }

    pub(crate) async fn create_sync_site(&self) -> anyhow::Result<CreateSyncSiteResult> {
        self.create_sync_site_with_extra_data(|_| json!({})).await
    }

    pub(crate) async fn create_sync_site_with_extra_data<F>(
        &self,
        // Before site is inserted and linked to store
        pre_site_creation_data: F,
    ) -> anyhow::Result<CreateSyncSiteResult>
    where
        F: Fn(&NewSiteProperties) -> serde_json::Value,
    {
        let new_site_properties = NewSiteProperties::new(&self.new_site_password);
        self.api
            .upsert_central_records(&new_site_properties.preliminary_data())
            .await?;
        self.api
            .upsert_central_records(&pre_site_creation_data(&new_site_properties))
            .await?;

        self.api
            .upsert_central_records(&new_site_properties.site_data())
            .await?;

        Ok(CreateSyncSiteResult {
            sync_settings: SyncSettings {
                url: self.server_url.clone(),
                username: new_site_properties.site_id_as_string(),
                password_sha256: new_site_properties.password_sha256.clone(),
                interval_sec: 10000000,
                central_server_site_id: 1,
                site_id: new_site_properties.site_id as u32,
            },
            new_site_properties,
        })
    }
}

pub(crate) struct NewSiteProperties {
    pub(crate) store_id: String,
    pub(crate) name_id: String,
    pref_id: String,
    pub(crate) site_uuid: String,
    pub(crate) site_id: u16,
    password_sha256: String,
}

impl NewSiteProperties {
    fn new(password: &str) -> NewSiteProperties {
        NewSiteProperties {
            store_id: uuid(),
            name_id: uuid(),
            pref_id: uuid(),
            // TODO max that can be used ?
            site_id: thread_rng().gen::<u16>(),
            site_uuid: uuid(),
            password_sha256: sha256(password),
        }
    }
    fn site_id_as_string(&self) -> String {
        format!("{}", self.site_id)
    }

    // Data for creating site was deduced by doing diff of central data by running below code before and after creating store and site
    // re-saving export each time for clean diff and doing a temp commit (or can save to multiple files and do --no-index git diff)
    //
    // var $content : Text
    // For each ($tableName; ds)
    // $recordInTable:=ds[$tableName].all()
    // For each ($record; $recordInTable)
    //     $content:=$content+$tableName+JSON Stringify($record.toObject(); *)
    // End for each
    // End for each
    // $file:=File("/Users/Drei/Documents/repos/work/msupply/out.txt")
    // $file.create()
    // $file.setText($content; Document with CR)

    // Data without site
    fn preliminary_data(&self) -> serde_json::Value {
        json!(
        {
            "name": [
                {
                    "ID": self.name_id,
                    "name": self.name_id
                }
            ],
            "store": [
                {
                    "ID":  self.store_id,
                    "name":  self.store_id,
                    "code":  self.store_id,
                    "name_ID":  self.name_id,
                    "sync_id_remote_site": 0,
                    "store_mode": "store"
                }
            ],
            "pref": [
                {
                    "item": "store_preferences",
                    "user_ID": "",
                    "ID": self.pref_id,
                    "network_ID": "",
                    "store_ID":  self.store_id,
                    "data": {
                        "sort_batches_by_VVM_not_expiry": false,
                        "new_patients_visible_in_this_store_only": true,
                        "new_names_visible_in_this_store_only": true,
                        "can_enter_total_distribution_quantities": false,
                        "round_up_distribute_quantities": false,
                        "can_pack_items_into_multiple_boxes": false,
                        "can_issue_in_foreign_currency": false,
                        "edit_sell_price_on_customer_invoice_lines": false,
                        "purchase_order_must_be_authorised": false,
                        "finalise_customer_invoices_automatically": false,
                        "customer_invoices_must_be_authorised": false,
                        "customer_invoice_authorisation_needed_only_if_over_budget": false,
                        "confirm_customer_invoices_automatically": false,
                        "supplier_invoices_must_be_authorised": false,
                        "confirm_supplier_invoices_automatically": false,
                        "goods_received_lines_must_be_authorised": false,
                        "must_enter_locations_on_goods_received": false,
                        "can_specify_manufacturer": false,
                        "show_item_unit_column_while_issuing": false,
                        "log_editing_transacts": false,
                        "default_item_packsize_to_one": true,
                        "shouldAuthoriseResponseRequisition": false,
                        "includeRequisitionsInSuppliersRemoteAuthorisationProcesses": false,
                        "canLinkRequistionToSupplierInvoice": false,
                        "responseRequisitionAutoFillSupplyQuantity": false,
                        "useExtraFieldsForRequisitions": false,
                        "CommentFieldToBeShownOnSupplierInvoiceLines": false,
                        "UseEDDPlaceholderLinesOnSupplierInvoice": false,
                        "consolidateBatches": false,
                        "editPrescribedQuantityOnPrescription": false,
                        "chooseDiagnosisOnPrescription": false,
                        "useConsumptionAndStockFromCustomersForInternalOrders": false,
                        "monthlyConsumptionEnforceLookBackPeriod": false,
                        "usesVaccineModule": false,
                        "usesDashboardModule": false,
                        "usesCashRegisterModule": false,
                        "usesPaymentModule": false,
                        "usesPatientTypes": false,
                        "usesHideSnapshotColumn": false,
                        "good_receipt_finalise_next_action": "supplier_invoice_on_hold",
                        "stock_transfer_supplier_invoice_is_on_hold": true,
                        "monthlyConsumptionLookBackPeriod": "0",
                        "monthsLeadTime": "0",
                        "usesDispensaryModule": false,
                        "monthsOverstock": 6 as u32,
                        "monthsUnderstock": 3 as u32,
                        "monthsItemsExpire": 3 as u32,
                    }
                }
            ]
        })
    }

    // Data with site (relies on preliminary data already inserted)
    fn site_data(&self) -> serde_json::Value {
        json!(
        {
            "site": [
                {
                    "ID":  self.site_uuid,
                    "site_ID": self.site_id,
                    "name":  self.site_id_as_string(),
                    "password":  self.password_sha256,
                    "code": self.site_id_as_string()
                }
            ],
            "store": [
                {
                    "ID":  self.store_id,
                    "name":  self.store_id,
                    "code":  self.store_id,
                    "name_ID":  self.name_id,
                    "sync_id_remote_site":  self.site_id,
                    "store_mode": "store"
                }
            ]
        })
    }
}
