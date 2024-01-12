use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding program_event.patient_link_id
        ALTER TABLE program_event
        ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';

        UPDATE program_event
        SET patient_link_id = patient_id;

        ALTER TABLE program_event ADD CONSTRAINT program_event_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES name_link(id);
       "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding program_event.item_link_id
        -- Disable foreign key checks to avoid firing constraints on adding new FK column
        PRAGMA foreign_keys = OFF;

        ALTER TABLE program_event
        ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES name_link(id); -- Can't have NOT NULL without a default... no sqlite PRAGMA for turning constraints off!

        UPDATE program_event
        SET patient_link_id = patient_id;

        PRAGMA foreign_keys = ON;
     "#,
    )?;

    Ok(())
}
