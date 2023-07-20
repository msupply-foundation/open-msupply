use crate::migrations::sql;
use crate::{
    ContextRow, ContextRowRepository, ProgramFilter, ProgramRepository, ProgramRowRepository,
    StorageConnection, PATIENT_CONTEXT_ID,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE context (
          id TEXT NOT NULL PRIMARY KEY,
          name TEXT NOT NULL
        );
        "#
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        PRAGMA foreign_keys = 0;
        ALTER TABLE program ADD COLUMN context_id TEXT NOT NULL DEFAULT temp REFERENCES context(id);
        PRAGMA foreign_keys = 1;
        "#
    )?;
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TABLE program ADD COLUMN context_id TEXT NOT NULL DEFAULT '';
        "#
    )?;
    // Create a context row for every existing program and update the program row
    let programs = ProgramRepository::new(connection).query_by_filter(ProgramFilter::new())?;
    for mut program in programs {
        ContextRowRepository::new(connection).upsert_one(&ContextRow {
            id: program.id.clone(),
            name: program.name.clone(),
        })?;
        program.context_id = program.id.clone();
        ProgramRowRepository::new(connection).upsert_one(&program)?;
    }
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TABLE program ADD CONSTRAINT program_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);
        "#
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            ALTER TABLE document ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE document DROP COLUMN context;

            ALTER TABLE program_event ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE program_event DROP COLUMN context;

            ALTER TABLE document_registry ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE document_registry DROP COLUMN document_context;

            ALTER TABLE user_permission ADD COLUMN context_id TEXT REFERENCES context(id);
            ALTER TABLE user_permission DROP COLUMN context;

            ALTER TABLE program_enrolment ADD COLUMN program_id TEXT REFERENCES program(id);
            ALTER TABLE program_enrolment DROP COLUMN context;

            ALTER TABLE encounter ADD COLUMN program_id TEXT REFERENCES program(id);
            ALTER TABLE encounter DROP COLUMN context;
            "#
    )?;

    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TABLE document RENAME COLUMN context TO context_id;
        ALTER TABLE document ADD CONSTRAINT document_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);

        ALTER TABLE program_event RENAME COLUMN context TO context_id;
        ALTER TABLE program_event ADD CONSTRAINT program_event_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);

        -- Seems like that in postgres you need to recreate the view to make the new column visible...
        DROP VIEW latest_document;
        CREATE VIEW latest_document
        AS
            SELECT d.*
            FROM (
            SELECT name, MAX(datetime) AS datetime
                FROM document
                GROUP BY name
        ) grouped
                INNER JOIN document d
                ON d.name = grouped.name AND d.datetime = grouped.datetime;

        ALTER TABLE document_registry RENAME COLUMN document_context TO context_id;
        ALTER TABLE document_registry ADD CONSTRAINT document_registry_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);

        ALTER TABLE user_permission RENAME COLUMN context TO context_id;
        ALTER TABLE user_permission ADD CONSTRAINT user_permission_context_id_fkey FOREIGN KEY (context_id) REFERENCES context(id);

        ALTER TABLE program_enrolment RENAME COLUMN context TO program_id;
        ALTER TABLE program_enrolment ADD CONSTRAINT program_enrolment_program_id_fkey FOREIGN KEY (program_id) REFERENCES program(id);

        ALTER TABLE encounter RENAME COLUMN context TO program_id;
        ALTER TABLE encounter ADD CONSTRAINT encounter_enrolment_program_id_fkey FOREIGN KEY (program_id) REFERENCES program(id);
        "#
    )?;

    sql!(
        connection,
        "INSERT INTO context (id, name) VALUES('{}', 'Patient context');",
        PATIENT_CONTEXT_ID
    )?;

    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_context_program_upgrade() {
    use crate::migrations::{v1_01_16::V1_01_16, Migration};
    use crate::mock::MockDataInserts;
    use crate::MasterListRepository;
    use crate::{
        program_row::program, test_db::*, ContextRowRepository, MasterListFilter, ProgramFilter,
        ProgramRepository,
    };
    use diesel::prelude::*;

    let prev_version = V1_01_16.version();

    // test that the migration adds a context for every program
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_context_program_upgrade"),
        version: Some(prev_version.clone()),
        inserts: MockDataInserts::none()
            .units()
            .items()
            .names()
            .full_master_list(),
        ..Default::default()
    })
    .await;

    // add programs for every master_list (just for testing)
    let master_lists = MasterListRepository::new(&connection)
        .query_by_filter(MasterListFilter::new())
        .unwrap();
    for master_list in master_lists {
        diesel::insert_into(program::table)
            .values((
                program::dsl::id.eq(&master_list.id.clone()),
                program::dsl::name.eq(&master_list.name),
                program::dsl::master_list_id.eq(&master_list.id),
            ))
            .execute(&connection.connection)
            .unwrap();
    }

    migrate(&connection).unwrap();

    let programs = ProgramRepository::new(&connection)
        .query_by_filter(ProgramFilter::new())
        .unwrap();
    assert!(!programs.is_empty());

    for program in programs {
        let context = ContextRowRepository::new(&connection)
            .find_one_by_id(&program.id)
            .unwrap();
        let context = context.unwrap();
        assert_eq!(program.context_id, context.id)
    }
}
