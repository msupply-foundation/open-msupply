use crate::{
    database::repository::StorageConnectionManager,
    server::service::graphql::ContextExt,
    service::invoice::{get_invoice, insert_supplier_invoice, update_supplier_invoice},
};

use self::supplier_invoice::{
    delete::{DeleteSupplierInvoiceInput, DeleteSupplierInvoiceResponse},
    insert::{InsertSupplierInvoiceInput, InsertSupplierInvoiceResponse},
    line::{
        delete::{DeleteSupplierInvoiceLineInput, DeleteSupplierInvoiceLineResponse},
        insert::{InsertSupplierInvoiceLineInput, InsertSupplierInvoiceLineResponse},
        update::{UpdateSupplierInvoiceLineInput, UpdateSupplierInvoiceLineResponse},
    },
    update::{UpdateSupplierInvoiceInput, UpdateSupplierInvoiceResponse},
};
use async_graphql::*;
pub mod supplier_invoice;

pub struct Mutations;

#[Object]
impl Mutations {
    async fn insert_supplier_invoice(
        &self,
        ctx: &Context<'_>,
        input: InsertSupplierInvoiceInput,
    ) -> InsertSupplierInvoiceResponse {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match insert_supplier_invoice(connection_manager, input.into()) {
            Ok(id) => get_invoice(connection_manager, id).into(),
            Err(error) => error.into(),
        }
    }

    async fn update_supplier_invoice(
        &self,
        ctx: &Context<'_>,
        input: UpdateSupplierInvoiceInput,
    ) -> UpdateSupplierInvoiceResponse {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();

        match update_supplier_invoice(connection_manager, input.into()) {
            Ok(id) => get_invoice(connection_manager, id).into(),
            Err(error) => error.into(),
        }
    }

    async fn delete_supplier_invoice(
        &self,
        ctx: &Context<'_>,
        input: DeleteSupplierInvoiceInput,
    ) -> DeleteSupplierInvoiceResponse {
        todo!();
    }

    async fn insert_supplier_invoice_line(
        &self,
        ctx: &Context<'_>,
        input: InsertSupplierInvoiceLineInput,
    ) -> InsertSupplierInvoiceLineResponse {
        todo!();
    }

    async fn update_supplier_invoice_line(
        &self,
        ctx: &Context<'_>,
        input: UpdateSupplierInvoiceLineInput,
    ) -> UpdateSupplierInvoiceLineResponse {
        todo!();
    }

    async fn delete_supplier_invoice_line(
        &self,
        ctx: &Context<'_>,
        input: DeleteSupplierInvoiceLineInput,
    ) -> DeleteSupplierInvoiceLineResponse {
        todo!();
    }
}

// Common Mutation Errors
#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ForeignKey {
    OtherPartyId,
    ItemId,
}

pub struct ForeignKeyError(ForeignKey);
#[Object]
impl ForeignKeyError {
    pub async fn description(&self) -> &'static str {
        "FK record doesn't exist"
    }

    pub async fn key(&self) -> ForeignKey {
        self.0
    }
}

pub struct RecordDoesNotExist;
#[Object]
impl RecordDoesNotExist {
    pub async fn description(&self) -> &'static str {
        "Record does not exist"
    }
}

pub struct RecordAlreadyExist;
#[Object]
impl RecordAlreadyExist {
    pub async fn description(&self) -> &'static str {
        "Record already exists"
    }
}

pub struct CannotEditFinalisedInvoice;
#[Object]
impl CannotEditFinalisedInvoice {
    pub async fn description(&self) -> &'static str {
        "Cannot edit finalised invoice"
    }
}

pub struct NotASupplierInvoice;
#[Object]
impl NotASupplierInvoice {
    pub async fn description(&self) -> &'static str {
        "Invoice is not Supplier Invoice"
    }
}

pub struct InvoiceDoesNotBelongToCurrentStore;
#[Object]
impl InvoiceDoesNotBelongToCurrentStore {
    pub async fn description(&self) -> &'static str {
        "Invoice does not belong to current store"
    }
}

pub struct CannotChangeInvoiceBackToDraft;
#[Object]
impl CannotChangeInvoiceBackToDraft {
    pub async fn description(&self) -> &'static str {
        "Cannot change invoice back to draft"
    }
}

pub struct DeleteResponse(String);
#[Object]
impl DeleteResponse {
    pub async fn id(&self) -> &str {
        &self.0
    }
}
