use super::{
    StorageConnection, clinician_link_row::clinician_link, currency_row::currency,
    custom_fields_json::JsonValue, item_link_row::item_link, name_row::name,
    purchase_order_row::purchase_order, shipping_method_row::shipping_method, store_row::store,
    user_row::user_account,
};
use crate::{
    ChangelogRepository, ChangelogSyncType, Delete, RowActionType, SourceSiteId, Upsert,
    db_diesel::changelog::changelog::RowOrId, diesel_macros::define_linked_tables,
    repository_error::RepositoryError,
};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use std::any::Any;
use strum::Display;

define_linked_tables! {
    view: invoice = "invoice_view",
     core: invoice_with_links = "invoice",
     struct: InvoiceRow,
     repo: InvoiceRowRepository,
     shared:{
        name_store_id -> Nullable<Text>,
        store_id -> Text,
        user_id -> Nullable<Text>,
        invoice_number -> BigInt,
        #[sql_name = "type"]
        type_ -> crate::db_diesel::invoice_row::InvoiceTypeMapping,
        status -> crate::db_diesel::invoice_row::InvoiceStatusMapping,
        on_hold -> Bool,
        comment -> Nullable<Text>,
        their_reference -> Nullable<Text>,
        transport_reference -> Nullable<Text>,
        created_datetime -> Timestamp,
        allocated_datetime -> Nullable<Timestamp>,
        picked_datetime -> Nullable<Timestamp>,
        shipped_datetime -> Nullable<Timestamp>,
        delivered_datetime -> Nullable<Timestamp>,
        received_datetime -> Nullable<Timestamp>,
        verified_datetime -> Nullable<Timestamp>,
        cancelled_datetime -> Nullable<Timestamp>,
        colour -> Nullable<Text>,
        requisition_id -> Nullable<Text>,
        linked_invoice_id -> Nullable<Text>,
        tax_percentage -> Nullable<Double>,
        currency_id -> Nullable<Text>,
        currency_rate -> Double,
        clinician_link_id -> Nullable<Text>,
        original_shipment_id -> Nullable<Text>,
        backdated_datetime -> Nullable<Timestamp>,
        diagnosis_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        name_insurance_join_id -> Nullable<Text>,
        insurance_discount_amount -> Nullable<Double>,
        insurance_discount_percentage -> Nullable<Double>,
        is_cancellation -> Bool,
        expected_delivery_date -> Nullable<Date>,
        purchase_order_id -> Nullable<Text>,
        shipping_method_id -> Nullable<Text>,
        charges_local_currency -> Double,
        charges_foreign_currency -> Double,
        legacy_goods_received_id -> Nullable<Text>,
        custom_fields -> Nullable<crate::db_diesel::custom_fields_json::CustomFieldsJson>,
        prescription_request_id -> Nullable<Text>,
        campaign_id -> Nullable<Text>,
    },
    links:{
         name_link_id -> name_id,
    },
    optional_links: {
        default_donor_link_id -> default_donor_id,
    }
}

joinable!(invoice -> name (name_id));
joinable!(invoice -> store (store_id));
joinable!(invoice -> user_account (user_id));
joinable!(invoice -> currency (currency_id));
joinable!(invoice -> clinician_link (clinician_link_id));
joinable!(invoice -> shipping_method (shipping_method_id));
allow_tables_to_appear_in_same_query!(invoice, item_link);
allow_tables_to_appear_in_same_query!(invoice, purchase_order);

#[derive(
    DbEnum, Debug, Display, Clone, PartialEq, Eq, Serialize, Deserialize, Default, PartialOrd, Ord,
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceType {
    OutboundShipment,
    #[default]
    InboundShipment,
    Prescription,
    // Initially we had single inventory adjustment InvoiceType, this was changed to two separate types
    // central server may have old inventory adjustment type, thus map it to inventory additions
    #[serde(alias = "INVENTORY_ADJUSTMENT")]
    InventoryAddition,
    InventoryReduction,
    Repack,
    #[serde(alias = "OUTBOUND_RETURN")]
    SupplierReturn,
    #[serde(alias = "INBOUND_RETURN")]
    CustomerReturn,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default, strum::EnumIter)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceStatus {
    #[default]
    New,
    Allocated,
    Picked,
    Shipped,
    Received,
    Delivered,
    Verified,
    Cancelled,
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = invoice)]
pub struct InvoiceRow {
    pub id: String,
    pub name_store_id: Option<String>,
    pub store_id: String,
    pub user_id: Option<String>,
    pub invoice_number: i64,
    #[diesel(column_name = type_)]
    pub r#type: InvoiceType,
    pub status: InvoiceStatus,
    pub on_hold: bool,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub transport_reference: Option<String>,
    pub created_datetime: NaiveDateTime,
    pub allocated_datetime: Option<NaiveDateTime>,
    pub picked_datetime: Option<NaiveDateTime>,
    pub shipped_datetime: Option<NaiveDateTime>,
    pub delivered_datetime: Option<NaiveDateTime>,
    pub received_datetime: Option<NaiveDateTime>,
    pub verified_datetime: Option<NaiveDateTime>,
    pub cancelled_datetime: Option<NaiveDateTime>,
    pub colour: Option<String>,
    pub requisition_id: Option<String>,
    pub linked_invoice_id: Option<String>,
    pub tax_percentage: Option<f64>,
    pub currency_id: Option<String>,
    pub currency_rate: f64,
    pub clinician_link_id: Option<String>,
    pub original_shipment_id: Option<String>,
    pub backdated_datetime: Option<NaiveDateTime>,
    pub diagnosis_id: Option<String>,
    pub program_id: Option<String>,
    pub name_insurance_join_id: Option<String>,
    pub insurance_discount_amount: Option<f64>,
    pub insurance_discount_percentage: Option<f64>,
    pub is_cancellation: bool,
    pub expected_delivery_date: Option<NaiveDate>,
    pub purchase_order_id: Option<String>,
    pub shipping_method_id: Option<String>,
    pub charges_local_currency: f64,
    pub charges_foreign_currency: f64,
    /// Legacy `transact.goods_received_ID` carried over from OG so the goods_received
    /// translator can find the invoice spawned by a finalised GR without scanning
    /// sync_buffer. Internal only — never synced.
    pub legacy_goods_received_id: Option<String>,
    /// Properties-v2 values keyed by `custom_field.key` (see the properties dev
    /// doc). Rides this row over v7; the v5 translator maps the type's category
    /// key to/from legacy `transact.category_ID`.
    pub custom_fields: Option<JsonValue>,
    /// Soft link (no FK) to the prescriber's prescription_request this dispensing
    /// invoice was generated from — the order is remote-owned, so a
    /// patient-distributed copy of this invoice can land on sites without it.
    pub prescription_request_id: Option<String>,
    /// The shipment-level campaign (None = routine). On inbound, the line
    /// editor prefills new batches with it and lines added from a master list
    /// or internal order take it; on outbound it's the campaign the shipment
    /// issues for, and auto-allocation only picks batches of that campaign.
    pub campaign_id: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub name_id: String,
    pub default_donor_id: Option<String>,
}
pub struct InvoiceRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &InvoiceRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        let changelog = InvoiceRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    fn _delete(&self, invoice_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(invoice_with_links::table.filter(invoice_with_links::id.eq(invoice_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, invoice_id: &str) -> Result<(), RepositoryError> {
        let changelog = InvoiceRow::generate_changelog(
            RowOrId::Id(invoice_id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;
        self._delete(invoice_id)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, invoice_id: &str) -> Result<Option<InvoiceRow>, RepositoryError> {
        let result = invoice::table
            .filter(invoice::id.eq(invoice_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    /// Like `find_one_by_id`, but takes a row-level lock (`SELECT ... FOR UPDATE`) on the
    /// invoice row for the rest of the current transaction, so nothing else can change the row
    /// between this read and a write based on it.
    ///
    /// The lock is taken on the `invoice` table (`invoice_with_links`), not on `invoice_view`,
    /// which joins `name_link` and would lock that row too. The row is then read through the
    /// view as usual: under READ COMMITTED that read sees whatever a writer the lock waited for
    /// committed.
    // feature postgres
    #[cfg(feature = "postgres")]
    pub fn find_one_by_id_for_update(
        &self,
        invoice_id: &str,
    ) -> Result<Option<InvoiceRow>, RepositoryError> {
        let locked_id: Option<String> = invoice_with_links::table
            .filter(invoice_with_links::id.eq(invoice_id))
            .select(invoice_with_links::id)
            .for_update()
            .first(self.connection.lock().connection())
            .optional()?;
        match locked_id {
            Some(_) => self.find_one_by_id(invoice_id),
            None => Ok(None),
        }
    }

    // feature sqlite
    // SQLite allows only a single write transaction at a time (transactions are opened with
    // `BEGIN IMMEDIATE`), so writers are already serialised and no row-level lock is needed.
    #[cfg(not(feature = "postgres"))]
    pub fn find_one_by_id_for_update(
        &self,
        invoice_id: &str,
    ) -> Result<Option<InvoiceRow>, RepositoryError> {
        self.find_one_by_id(invoice_id)
    }

    pub fn check_exists_by_id(&self, invoice_id: &str) -> Result<bool, RepositoryError> {
        let exists: bool = diesel::select(diesel::dsl::exists(
            invoice::table.filter(invoice::id.eq(invoice_id)),
        ))
        .get_result(self.connection.lock().connection())?;
        Ok(exists)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<InvoiceRow>, RepositoryError> {
        let result = invoice::table
            .filter(invoice::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_legacy_goods_received_id(
        &self,
        goods_received_id: &str,
    ) -> Result<Option<InvoiceRow>, RepositoryError> {
        let result = invoice::table
            .filter(invoice::legacy_goods_received_id.eq(goods_received_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_max_invoice_number(
        &self,
        r#type: InvoiceType,
        store: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = invoice::table
            .filter(invoice::type_.eq(r#type).and(invoice::store_id.eq(store)))
            .select(diesel::dsl::max(invoice::invoice_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct InvoiceRowDelete(pub String);
impl Delete for InvoiceRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let repo = InvoiceRowRepository::new(con);

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => InvoiceRow::generate_changelog(
                RowOrId::Id(&self.0),
                con,
                RowActionType::Delete,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        repo._delete(&self.0)?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            InvoiceRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for InvoiceRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        InvoiceRowRepository::new(con)._upsert(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => InvoiceRow::generate_changelog(
                RowOrId::Row(self),
                con,
                RowActionType::Upsert,
                SourceSiteId::SourceSiteId(source_site_id),
            )?,
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            InvoiceRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }

    fn as_mut_any(&mut self) -> Option<&mut dyn Any> {
        Some(self)
    }
}

#[cfg(test)]
mod test {
    use std::{
        sync::mpsc,
        thread,
        time::{Duration, Instant},
    };

    use crate::{
        InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType,
        mock::{MockData, MockDataInserts, mock_name_store_a, mock_name_store_b, mock_store_a},
        test_db::setup_all_with_data,
    };

    /// A transfer processor step reads an invoice with `find_one_by_id_for_update`, then writes
    /// it. A second writer that locks the row in the meantime waits until the step commits, then
    /// reads the step's write rather than the row as it was. On Postgres that's the row lock; on
    /// SQLite, `BEGIN IMMEDIATE` lets only one write transaction in at a time.
    #[actix_rt::test]
    async fn find_one_by_id_for_update_holds_the_next_writer_until_commit() {
        let outbound = InvoiceRow {
            id: "for_update_outbound".to_string(),
            name_id: mock_name_store_b().id,
            store_id: mock_store_a().id,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Picked,
            ..Default::default()
        };
        let inbound = InvoiceRow {
            id: "for_update_inbound".to_string(),
            name_id: mock_name_store_a().id,
            store_id: mock_store_a().id,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::Picked,
            ..Default::default()
        };
        let (_, _, connection_manager, _) = setup_all_with_data(
            "find_one_by_id_for_update_holds_the_next_writer_until_commit",
            MockDataInserts::none().names().stores(),
            MockData {
                invoices: vec![outbound.clone(), inbound.clone()],
                ..Default::default()
            },
        )
        .await;

        // The step: lock and read the outbound, take a while, then link it from its copy
        let (locked_sender, locked) = mpsc::channel();
        let step = {
            let connection_manager = connection_manager.clone();
            let outbound_id = outbound.id.clone();
            let inbound_id = inbound.id.clone();
            thread::spawn(move || {
                let connection = connection_manager.connection().unwrap();
                connection
                    .transaction_sync(|connection| {
                        let repo = InvoiceRowRepository::new(connection);
                        let row = repo.find_one_by_id_for_update(&outbound_id)?.unwrap();
                        locked_sender.send(()).unwrap();
                        thread::sleep(Duration::from_millis(500));
                        repo.upsert_one(&InvoiceRow {
                            linked_invoice_id: Some(inbound_id),
                            ..row
                        })
                    })
                    .unwrap();
            })
        };

        // The second writer: ship the outbound while the step holds it
        locked.recv().unwrap();
        let started = Instant::now();
        let connection = connection_manager.connection().unwrap();
        connection
            .transaction_sync(|connection| {
                let repo = InvoiceRowRepository::new(connection);
                let row = repo.find_one_by_id_for_update(&outbound.id)?.unwrap();
                repo.upsert_one(&InvoiceRow {
                    status: InvoiceStatus::Shipped,
                    ..row
                })
            })
            .unwrap();
        let waited = started.elapsed();
        step.join().unwrap();

        assert!(
            waited >= Duration::from_millis(400),
            "the second writer should wait for the step to commit, waited {waited:?}"
        );
        let outbound_after = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&outbound.id)
            .unwrap()
            .unwrap();
        assert_eq!(outbound_after.linked_invoice_id, Some(inbound.id.clone()));
        assert_eq!(outbound_after.status, InvoiceStatus::Shipped);
    }
}
