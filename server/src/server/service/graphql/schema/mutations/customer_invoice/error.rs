use async_graphql::Object;

pub struct OtherPartyNotASupplierError;

#[Object]
impl OtherPartyNotASupplierError {
    pub async fn description(&self) -> &str {
        "other_party_id must reference a valid supplier."
    }
}

pub struct NotACustomerInvoiceError;

#[Object]
impl NotACustomerInvoiceError {
    pub async fn description(&self) -> &str {
        "Invoice must be a customer invoice."
    }
}

pub struct CannotEditFinalisedInvoiceError;

#[Object]
impl CannotEditFinalisedInvoiceError {
    pub async fn description(&self) -> &str {
        "Cannot edit a finalised invoice."
    }
}

pub struct InvoiceDoesNotBelongToCurrentStoreError;

#[Object]
impl InvoiceDoesNotBelongToCurrentStoreError {
    pub async fn description(&self) -> &str {
        "Cannot edit this invoice as it does not belong to the current store."
    }
}

pub struct CannotChangeInvoiceBackToDraftError;

#[Object]
impl CannotChangeInvoiceBackToDraftError {
    pub async fn description(&self) -> &str {
        "Once confirmed or finalised, an invoice cannot be changed back to a draft."
    }
}

pub struct CannotDeleteFinalisedInvoiceError;

#[Object]
impl CannotDeleteFinalisedInvoiceError {
    pub async fn description(&self) -> &str {
        "Once finalised, an invoice cannot be deleted."
    }
}
