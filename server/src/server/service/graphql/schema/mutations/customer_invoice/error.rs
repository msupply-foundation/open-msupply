use async_graphql::Object;

pub struct CannotChangeStatusBackToDraftError;

#[Object]
impl CannotChangeStatusBackToDraftError {
    pub async fn description(&self) -> &str {
        "Once confirmed or finalised, an invoice cannot be changed back to a draft."
    }
}

pub struct CanOnlyEditInvoicesInLoggedInStoreError;

#[Object]
impl CanOnlyEditInvoicesInLoggedInStoreError {
    pub async fn description(&self) -> &str {
        "Once finalised, an invoice cannot be edited."
    }
}

pub struct FinalisedInvoiceIsNotEditableError;

#[Object]
impl FinalisedInvoiceIsNotEditableError {
    pub async fn description(&self) -> &str {
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

pub struct InvoiceNotFoundError(pub String);

#[Object]
impl InvoiceNotFoundError {
    pub async fn description(&self) -> String {
        format!("Invoice with id '{}' not found.", self.0)
    }
}

pub struct OtherPartyCannotBeThisStoreError;

#[Object]
impl OtherPartyCannotBeThisStoreError {
    pub async fn description(&self) -> &str {
        "Other party must be another store."
    }
}

pub struct OtherPartyIdMissingError;

#[Object]
impl OtherPartyIdMissingError {
    pub async fn description(&self) -> &str {
        "Other party id missing."
    }
}

pub struct OtherPartyIdNotFoundError(pub String);

#[Object]
impl OtherPartyIdNotFoundError {
    pub async fn description(&self) -> String {
        format!("Other party with id '{}' not found.", self.0)
    }
}

pub struct OtherPartyNotACustomerOfThisStoreError(pub String);

#[Object]
impl OtherPartyNotACustomerOfThisStoreError {
    pub async fn description(&self) -> String {
        format!(
            "Other party with id '{}' is not a valid supplier of this store.",
            self.0
        )
    }
}
