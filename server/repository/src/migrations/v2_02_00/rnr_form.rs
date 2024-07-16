use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
          CREATE TYPE rnr_form_status AS ENUM (
            'DRAFT',
            'FINALISED'
          );
        "#
    )?;

    const RNR_FORM_STATUS_ENUM_TYPE: &str = if cfg!(feature = "postgres") {
        "rnr_form_status"
    } else {
        "TEXT"
    };
    sql!(
        connection,
        r#"
           CREATE TABLE rnr_form (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES store(id),
                name_link_id TEXT NOT NULL REFERENCES name_link(id),
                period_id TEXT NOT NULL REFERENCES period(id),
                program_id TEXT NOT NULL REFERENCES program(id),
                status {RNR_FORM_STATUS_ENUM_TYPE} NOT NULL,
                created_datetime TIMESTAMP NOT NULL,
                finalised_datetime TIMESTAMP,
                linked_requisition_id TEXT
            )

        "#
    )?;

    Ok(())
}
