use async_graphql::*;
use graphql_core::generic_inputs::InboundShipmentType;
use graphql_core::standard_graphql_error::{StandardGraphqlError, validate_auth};
use graphql_types::types::InvoiceLineStatusType;
use repository::{InvoiceLineRowRepository, InvoiceLineStatus, StorageConnection};
use service::auth::{Resource, ResourceAccessRequest};

pub mod delete;
pub mod insert;
pub mod insert_from_internal_order;
pub mod update;

/// What one line in a call asks of its authorisation state, for
/// [`validate_line_edit_authorisation`].
pub enum LineAuthorisation {
    /// A new line, with the state it is inserted with (omitted: Pending).
    Insert(Option<InvoiceLineStatusType>),
    /// An existing line, with the state the update sets (omitted: unchanged).
    Update {
        id: String,
        status: Option<Option<InvoiceLineStatusType>>,
    },
}

/// Passing or rejecting a batch is the sign-off (spec inbound-shipments rules →
/// line authorisation).
fn is_sign_off(status: Option<InvoiceLineStatusType>) -> bool {
    matches!(
        status,
        Some(InvoiceLineStatusType::Passed) | Some(InvoiceLineStatusType::Rejected)
    )
}

/// A new line needs the authorise permission only when it arrives signed off.
fn insert_needs_authorise(status: Option<InvoiceLineStatusType>) -> bool {
    is_sign_off(status)
}

/// An update needs the authorise permission when it signs the line off
/// (including a resave of the state it already holds), or when it touches a
/// line already signed off without sending it back to Pending. Sending a line
/// back to Pending is open to anyone who may edit the shipment.
fn update_needs_authorise(
    requested: Option<Option<InvoiceLineStatusType>>,
    stored: Option<&InvoiceLineStatus>,
) -> bool {
    match requested {
        Some(Some(InvoiceLineStatusType::Pending)) => false,
        Some(status @ Some(_)) => is_sign_off(status),
        // State left as it is: a signed-off line stays closed. (`Some(None)`
        // never arrives: async-graphql parses an explicit null as omitted.)
        _ => matches!(
            stored,
            Some(InvoiceLineStatus::Passed) | Some(InvoiceLineStatus::Rejected)
        ),
    }
}

/// Check whether inserting or updating inbound shipment lines requires the
/// AuthoriseInboundShipmentExternal permission. Only applies to external
/// inbound shipments.
pub fn validate_line_edit_authorisation(
    ctx: &Context<'_>,
    store_id: &str,
    r#type: &InboundShipmentType,
    connection: &StorageConnection,
    lines: &[LineAuthorisation],
) -> Result<()> {
    if *r#type != InboundShipmentType::InboundShipmentExternal {
        return Ok(());
    }

    // TODO: come up with a better way to handle data based permissions. the graphql/service layer split makes it difficult to set permissions based on data
    let repo = InvoiceLineRowRepository::new(connection);
    let mut needs_authorise = false;
    for line in lines {
        needs_authorise = match line {
            LineAuthorisation::Insert(status) => insert_needs_authorise(*status),
            LineAuthorisation::Update { id, status } => {
                // Only a state left as it is needs the stored one.
                let stored = match status {
                    Some(Some(_)) => None,
                    _ => repo
                        .find_one_by_id(id)
                        .map_err(StandardGraphqlError::from_repository_error)?
                        .and_then(|l| l.status),
                };
                update_needs_authorise(*status, stored.as_ref())
            }
        };
        if needs_authorise {
            break;
        }
    }

    if needs_authorise {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::AuthoriseInboundShipmentExternal,
                store_id: Some(store_id.to_string()),
                require_central_standalone: false,
            },
        )?;
    }

    Ok(())
}

#[cfg(test)]
mod authorisation_test {
    use super::{insert_needs_authorise, update_needs_authorise};
    use graphql_types::types::InvoiceLineStatusType as Requested;
    use repository::InvoiceLineStatus as Stored;

    // OMS-FUN-ISE-001.12 / .15: a new batch may arrive signed off only with
    // the authorise permission.
    #[test]
    fn insert_needs_authorise_only_when_signed_off() {
        assert!(!insert_needs_authorise(None));
        assert!(!insert_needs_authorise(Some(Requested::Pending)));
        assert!(insert_needs_authorise(Some(Requested::Passed)));
        assert!(insert_needs_authorise(Some(Requested::Rejected)));
    }

    // OMS-FUN-ISE-001.14 / .15 / .16
    #[test]
    fn update_needs_authorise_to_sign_off_or_touch_a_signed_off_line() {
        // Signing off, whatever the line held — a resave included.
        for stored in [None, Some(Stored::Pending), Some(Stored::Passed)] {
            assert!(update_needs_authorise(
                Some(Some(Requested::Passed)),
                stored.as_ref()
            ));
            assert!(update_needs_authorise(
                Some(Some(Requested::Rejected)),
                stored.as_ref()
            ));
        }
        // .16: sending a line back to Pending is open to anyone.
        for stored in [
            Some(Stored::Pending),
            Some(Stored::Passed),
            Some(Stored::Rejected),
        ] {
            assert!(!update_needs_authorise(
                Some(Some(Requested::Pending)),
                stored.as_ref()
            ));
        }
        // .15: a signed-off line stays closed when its state is left alone.
        assert!(update_needs_authorise(None, Some(&Stored::Passed)));
        assert!(update_needs_authorise(None, Some(&Stored::Rejected)));
        // .14: a pending line, or one without a state, is open.
        assert!(!update_needs_authorise(None, Some(&Stored::Pending)));
        assert!(!update_needs_authorise(None, None));
    }
}

pub struct BatchIsReserved;
#[Object]
impl BatchIsReserved {
    pub async fn description(&self) -> &str {
        "Batch is already reserved/issued"
    }
}

pub struct LineLinkedToTransferredInvoice;
#[Object]
impl LineLinkedToTransferredInvoice {
    pub async fn description(&self) -> &str {
        "Cannot delete line generated from a generated invoice"
    }
}
