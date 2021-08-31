use super::diesel_schema::transact;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
pub enum TransactRowType {
    CustomerInvoice,
    CustomerCredit,
    SupplierInvoice,
    SupplierCredit,
    Repack,
    Build,
    Receipt,
    Payment,
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "transact"]
pub struct TransactRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub invoice_number: i32,
    pub type_of: TransactRowType,
}
