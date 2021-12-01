use async_graphql::Object;

use crate::schema::types::NameNode;

pub struct CannotChangeStatusBackToDraftError;

#[Object]
impl CannotChangeStatusBackToDraftError {
    pub async fn description(&self) -> &'static str {
        "Once confirmed or finalised, an invoice cannot be changed back to a draft."
    }
}

pub struct CannotChangeStatusOfInvoiceOnHold;

#[Object]
impl CannotChangeStatusOfInvoiceOnHold {
    pub async fn description(&self) -> &'static str {
        "Invoice is on hold, status cannot be changed."
    }
}

pub struct CanOnlyEditInvoicesInLoggedInStoreError;

#[Object]
impl CanOnlyEditInvoicesInLoggedInStoreError {
    pub async fn description(&self) -> &'static str {
        "Once finalised, an invoice cannot be edited."
    }
}

pub struct FinalisedInvoiceIsNotEditableError;

#[Object]
impl FinalisedInvoiceIsNotEditableError {
    pub async fn description(&self) -> &'static str {
        "Once finalised, an invoice cannot be edited."
    }
}

pub struct InvoiceDoesNotBelongToCurrentStoreError(pub String);

#[Object]
impl InvoiceDoesNotBelongToCurrentStoreError {
    pub async fn description(&self) -> String {
        format!(
            "Invoice with id '{}' does not belong to the current store.",
            self.0
        )
    }
}

pub struct OtherPartyCannotBeThisStoreError;

#[Object]
impl OtherPartyCannotBeThisStoreError {
    pub async fn description(&self) -> &'static str {
        "Other party must be another store."
    }
}

pub struct OtherPartyNotACustomerError(pub NameNode);

#[Object]
impl OtherPartyNotACustomerError {
    pub async fn description(&self) -> &'static str {
        "Other party name is not a customer"
    }

    pub async fn other_party(&self) -> &NameNode {
        &self.0
    }
}

pub struct NotAnOutboundShipmentError;

#[Object]
impl NotAnOutboundShipmentError {
    pub async fn description(&self) -> &'static str {
        "Not a outbound shipment."
    }
}

pub struct InvoiceLineHasNoStockLineError(pub String);

#[Object]
impl InvoiceLineHasNoStockLineError {
    pub async fn description(&self) -> String {
        format!("Invoice line ({}) has no matching stock line", self.0)
    }

    pub async fn invoice_line_id(&self) -> &str {
        &self.0
    }
}
pub struct LineDoesNotReferenceStockLine;

#[Object]
impl LineDoesNotReferenceStockLine {
    pub async fn description(&self) -> &'static str {
        "Line does not reference any stock line"
    }
}
