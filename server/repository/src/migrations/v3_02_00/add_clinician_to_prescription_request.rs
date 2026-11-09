use crate::migrations::*;

/// The clinician a prescription request names — the prescriber the request is
/// written on behalf of, chosen when the request is created rather than asked
/// for at the hand-over (issue #513).
///
/// It is NOT a record of who prescribed: that stays `created_by`, the account
/// that entered the request. This is the same field the dispensing invoice
/// carries, held on the request so the generated dispensation can be filled
/// from it (see `create_dispensation`).
///
/// A separate fragment rather than an amendment to
/// `add_prescription_request_tables`: that one has reached develop, so sites
/// already carry the table without this column.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_clinician_to_prescription_request"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE prescription_request
                ADD COLUMN clinician_link_id TEXT REFERENCES clinician_link(id);
            "#
        )?;

        Ok(())
    }
}
