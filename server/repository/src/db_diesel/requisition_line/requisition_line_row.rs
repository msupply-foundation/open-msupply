use crate::db_diesel::item_row::item;
use crate::db_diesel::requisition_row::requisition;
use crate::diesel_macros::define_linked_tables;
use crate::repository_error::RepositoryError;
<<<<<<< HEAD
use crate::{ItemLinkRowRepository, RequisitionRowRepository, StorageConnection};
=======
use crate::StorageConnection;
>>>>>>> origin/v3.0.0-RC
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::db_diesel::changelog::changelog::RowOrId;
use crate::{ChangelogRepository, RowActionType};
use crate::{ChangelogSyncType, Delete, SourceSiteId, Upsert};

use chrono::NaiveDateTime;

define_linked_tables! {
    view: requisition_line = "requisition_line_view",
    core: requisition_line_with_links = "requisition_line",
    struct: RequisitionLineRow,
    repo: RequisitionLineRowRepository,
    shared: {
        requisition_id -> Text,
        item_name -> Text,
        requested_quantity -> Double,
        suggested_quantity -> Double,
        supply_quantity -> Double,
        available_stock_on_hand -> Double,
        average_monthly_consumption -> Double,
        snapshot_datetime -> Nullable<Timestamp>,
        approved_quantity -> Double,
        approval_comment -> Nullable<Text>,
        price_per_unit -> Nullable<Double>,
        comment -> Nullable<Text>,
        available_volume -> Nullable<Double>,
        location_type_id -> Nullable<Text>,
        // Manual requisition fields
        initial_stock_on_hand_units -> Double,
        incoming_units -> Double,
        outgoing_units -> Double,
        loss_in_units -> Double,
        addition_in_units -> Double,
        expiring_units -> Double,
        days_out_of_stock -> Double,
        option_id -> Nullable<Text>,
        // Population forecasting fields
        forecast_total_units -> Nullable<Double>,
        forecast_total_doses -> Nullable<Double>,
        vaccine_courses -> Nullable<Text>,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(requisition_line -> item (item_id));
joinable!(requisition_line -> requisition (requisition_id));

#[derive(
    TS, Clone, Queryable, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = requisition_line)]
pub struct RequisitionLineRow {
    pub id: String,
    pub requisition_id: String,
    pub item_name: String,
    pub requested_quantity: f64,
    pub suggested_quantity: f64,
    pub supply_quantity: f64,
    pub available_stock_on_hand: f64,
    pub average_monthly_consumption: f64,
    pub snapshot_datetime: Option<NaiveDateTime>,
    pub approved_quantity: f64,
    pub approval_comment: Option<String>,
    pub price_per_unit: Option<f64>,
    pub comment: Option<String>,
    pub available_volume: Option<f64>,
    pub location_type_id: Option<String>,
    // Manual requisition fields
    pub initial_stock_on_hand_units: f64,
    pub incoming_units: f64,
    pub outgoing_units: f64,
    pub loss_in_units: f64,
    pub addition_in_units: f64,
    pub expiring_units: f64,
    pub days_out_of_stock: f64,
    pub option_id: Option<String>,
    // Population forecasting fields
    pub forecast_total_units: Option<f64>,
    pub forecast_total_doses: Option<f64>,
    pub vaccine_courses: Option<String>,
    // Resolved from item_link - must be last to match view column order.
    // Serialized as `item_link_id` to preserve the backend plugin JSON contract
    // (e.g. TransformRequestRequisitionLines) after the #11668 item_link rename.
    #[serde(rename = "item_link_id")]
    pub item_id: String,
}
pub struct RequisitionLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RequisitionLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RequisitionLineRowRepository { connection }
    }

<<<<<<< HEAD
    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<i64, RepositoryError> {
        self._upsert(row)?;
        self.insert_changelog(row, RowActionType::Upsert)
=======
    fn _upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(requisition_line::table)
            .values(row)
            .on_conflict(requisition_line::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &RequisitionLineRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = RequisitionLineRow::generate_changelog(
            RowOrId::Row(row),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
>>>>>>> origin/v3.0.0-RC
    }

    pub fn update_approved_quantity_by_item_id(
        &self,
        requisition_id_param: &str,
        item_id_param: &str,
        approved_quantity: f64,
    ) -> Result<(), RepositoryError> {
        // Resolve all item_link IDs for this canonical item_id so the update
        // covers merged items. We use a two-step fetch rather than a Diesel
        // subquery to avoid adding allow_tables_to_appear_in_same_query! between
        // the write table (requisition_line_with_links) and item_link, which
        // would reintroduce the coupling this abstraction is designed to prevent.
        let item_link_ids: Vec<String> = ItemLinkRowRepository::new(self.connection)
            .find_many_by_item_id(item_id_param)?
            .into_iter()
            .map(|l| l.id)
            .collect();

        diesel::update(requisition_line_with_links::table)
            .filter(
                requisition_line_with_links::requisition_id
                    .eq(requisition_id_param)
                    .and(requisition_line_with_links::item_link_id.eq_any(item_link_ids)),
            )
            .set(requisition_line_with_links::approved_quantity.eq(approved_quantity))
            .execute(self.connection.lock().connection())?;

        // Use view table for reads
        let rows: Vec<RequisitionLineRow> = requisition_line::table
            .filter(
                requisition_line::requisition_id
                    .eq(requisition_id_param)
                    .and(requisition_line::item_id.eq(item_id_param)),
            )
            .load(self.connection.lock().connection())?;

        for row in rows {
            let changelog = RequisitionLineRow::generate_changelog(
                RowOrId::Row(&row),
                self.connection,
                RowActionType::Upsert,
                SourceSiteId::CurrentSiteId,
            )?;
            ChangelogRepository::new(self.connection).insert(&changelog)?;
        }

        Ok(())
    }

    pub fn delete(&self, requisition_line_id: &str) -> Result<(), RepositoryError> {
        let changelog = RequisitionLineRow::generate_changelog(
            RowOrId::Id(requisition_line_id),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)?;

        diesel::delete(
            requisition_line_with_links::table
                .filter(requisition_line_with_links::id.eq(requisition_line_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<RequisitionLineRow>, RepositoryError> {
        let result = requisition_line::table
            .filter(requisition_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
        Ok(requisition_line::table
            .filter(requisition_line::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

#[derive(Debug, Clone)]
pub struct RequisitionLineRowDelete(pub String);
impl Delete for RequisitionLineRowDelete {
    fn delete_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                RequisitionLineRow::generate_changelog(
                    RowOrId::Id(&self.0),
                    con,
                    RowActionType::Delete,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        diesel::delete(requisition_line::table.filter(requisition_line::id.eq(&self.0)))
            .execute(con.lock().connection())?;
        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            RequisitionLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for RequisitionLineRow {
    fn upsert_sync(
        &self,
        con: &StorageConnection,
        sync_type: ChangelogSyncType,
    ) -> Result<(), RepositoryError> {
        RequisitionLineRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                RequisitionLineRow::generate_changelog(
                    RowOrId::Row(self),
                    con,
                    RowActionType::Upsert,
                    SourceSiteId::SourceSiteId(source_site_id),
                )?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            RequisitionLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod tests {
    use super::RequisitionLineRow;

    // The backend plugin contract (e.g. TransformRequestRequisitionLines) serializes
    // RequisitionLineRow to/from JSON. The #11668 item_link refactor renamed the Rust
    // field item_link_id -> item_id; a #[serde(rename)] keeps the JSON key as
    // `item_link_id` so existing plugins don't break. This test pins that contract.
    #[test]
    fn requisition_line_row_serializes_item_link_id_key() {
        let row = RequisitionLineRow {
            id: "line".to_string(),
            item_id: "item".to_string(),
            ..Default::default()
        };

        let json = serde_json::to_value(&row).unwrap();
        assert_eq!(json.get("item_link_id").and_then(|v| v.as_str()), Some("item"));
        assert!(json.get("item_id").is_none());

        // And it round-trips back from the `item_link_id` key.
        let parsed: RequisitionLineRow = serde_json::from_value(json).unwrap();
        assert_eq!(parsed.item_id, "item");
    }
}
