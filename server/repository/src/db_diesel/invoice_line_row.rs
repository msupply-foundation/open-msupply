use super::{
    campaign_row::campaign, invoice_line_row::invoice_line::dsl::*, invoice_row::invoice,
    item_link_row::item_link, location_row::location, name_link_row::name_link,
    reason_option_row::reason_option, stock_line_row::stock_line,
    vvm_status::vvm_status_row::vvm_status, StorageConnection,
};

use crate::repository_error::RepositoryError;
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, InvoiceRowRepository,
    RowActionType,
};
use crate::{Delete, Upsert};

use diesel::prelude::*;

use chrono::NaiveDate;
use diesel_derive_enum::DbEnum;

table! {
    invoice_line (id) {
        id -> Text,
        invoice_id -> Text,
        item_link_id -> Text,
        item_name -> Text,
        item_code -> Text,
        stock_line_id -> Nullable<Text>,
        location_id -> Nullable<Text>,
        batch -> Nullable<Text>,
        expiry_date -> Nullable<Date>,
        pack_size -> Double,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        total_before_tax -> Double,
        total_after_tax -> Double,
        tax_percentage -> Nullable<Double>,
        #[sql_name = "type"] type_ -> crate::db_diesel::invoice_line_row::InvoiceLineTypeMapping,
        number_of_packs -> Double,
        prescribed_quantity -> Nullable<Double>,
        note -> Nullable<Text>,
        foreign_currency_price_before_tax -> Nullable<Double>,
        item_variant_id -> Nullable<Text>,
        linked_invoice_id -> Nullable<Text>,
        donor_link_id -> Nullable<Text>,
        vvm_status_id -> Nullable<Text>,
        reason_option_id -> Nullable<Text>,
        campaign_id -> Nullable<Text>,
        program_id -> Nullable<Text>,
        shipped_number_of_packs -> Nullable<Double>,
        volume_per_pack -> Double,
        shipped_pack_size -> Nullable<Double>
    }
}

joinable!(invoice_line -> item_link (item_link_id));
joinable!(invoice_line -> stock_line (stock_line_id));
joinable!(invoice_line -> invoice (invoice_id));
joinable!(invoice_line -> location (location_id));
joinable!(invoice_line -> vvm_status (vvm_status_id));
joinable!(invoice_line -> reason_option (reason_option_id));
joinable!(invoice_line -> campaign (campaign_id));

allow_tables_to_appear_in_same_query!(invoice_line, item_link);
allow_tables_to_appear_in_same_query!(invoice_line, name_link);
allow_tables_to_appear_in_same_query!(invoice_line, reason_option);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum InvoiceLineType {
    #[default]
    StockIn,
    StockOut,
    UnallocatedStock,
    Service,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = invoice_line)]
pub struct InvoiceLineRow {
    pub id: String,
    pub invoice_id: String,
    pub item_link_id: String,
    pub item_name: String,
    pub item_code: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: f64,
    pub cost_price_per_pack: f64,
    /// Sell price before tax
    pub sell_price_per_pack: f64,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    /// Optional column to store line a line specific tax value
    pub tax_percentage: Option<f64>,
    #[diesel(column_name = "type_")]
    pub r#type: InvoiceLineType,
    pub number_of_packs: f64,
    pub prescribed_quantity: Option<f64>,
    pub note: Option<String>,
    pub foreign_currency_price_before_tax: Option<f64>,
    pub item_variant_id: Option<String>,
    pub linked_invoice_id: Option<String>,
    pub donor_link_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub reason_option_id: Option<String>,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
    pub shipped_number_of_packs: Option<f64>,
    pub volume_per_pack: f64,
    pub shipped_pack_size: Option<f64>,
}

pub struct InvoiceLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &InvoiceLineRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(invoice_line)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &InvoiceLineRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let invoice = InvoiceRowRepository::new(self.connection).find_one_by_id(&row.invoice_id)?;
        let invoice = match invoice {
            Some(invoice) => invoice,
            None => return Err(RepositoryError::NotFound),
        };

        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::InvoiceLine,
            record_id: row.id.clone(),
            row_action: action,
            store_id: Some(invoice.store_id.clone()),
            name_link_id: Some(invoice.name_id.clone()),
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn update_reason_option_id(
        &self,
        record_id: &str,
        reason_id: Option<String>,
    ) -> Result<(), RepositoryError> {
        diesel::update(invoice_line)
            .filter(id.eq(record_id))
            .set(reason_option_id.eq(reason_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn update_tax(
        &self,
        record_id: &str,
        tax_input: Option<f64>,
        total_after_tax_calculation: f64,
    ) -> Result<(), RepositoryError> {
        diesel::update(invoice_line)
            .filter(id.eq(record_id))
            .set((
                tax_percentage.eq(tax_input),
                total_after_tax.eq(total_after_tax_calculation),
            ))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn update_currency(
        &self,
        record_id: &str,
        foreign_currency_price_before_tax_calculation: Option<f64>,
    ) -> Result<(), RepositoryError> {
        diesel::update(invoice_line)
            .filter(id.eq(record_id))
            .set(
                foreign_currency_price_before_tax.eq(foreign_currency_price_before_tax_calculation),
            )
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn update_note_by_invoice_and_item_id(
        &self,
        invoice: &str,
        item_link: &str,
        new_note: Option<String>,
    ) -> Result<(), RepositoryError> {
        diesel::update(invoice_line)
            .filter(invoice_id.eq(invoice))
            .filter(item_link_id.eq(item_link))
            .set(note.eq(new_note))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, invoice_line_id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(invoice_line_id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(&old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(invoice_line.filter(id.eq(invoice_line_id)))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_one_by_id(
        &self,
        invoice_line_id: &str,
    ) -> Result<Option<InvoiceLineRow>, RepositoryError> {
        let result = invoice_line
            .filter(id.eq(invoice_line_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        let result = invoice_line
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_invoice_and_batch_id(
        &self,
        stock_line_id_param: &str,
        invoice_id_param: &str,
    ) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        Ok(invoice_line
            .filter(invoice_id.eq(invoice_id_param))
            .filter(stock_line_id.eq(stock_line_id_param))
            .load(self.connection.lock().connection())?)
    }

    pub fn find_many_by_invoice_id(
        &self,
        invoice_id_param: &str,
    ) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
        let result = invoice_line
            .filter(invoice_id.eq(invoice_id_param))
            .get_results(self.connection.lock().connection())?;
        Ok(result)
    }
}

#[derive(Debug, Clone)]
pub struct InvoiceLineRowDelete(pub String);
impl Delete for InvoiceLineRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = InvoiceLineRowRepository::new(con).delete(&self.0)?;
        Ok(change_log_id)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            InvoiceLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for InvoiceLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = InvoiceLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            InvoiceLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
