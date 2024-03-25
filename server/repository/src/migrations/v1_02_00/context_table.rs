use crate::{migrations::sql, StorageConnection};
use diesel::prelude::*;
use util::constants::PATIENT_CONTEXT_ID;

table! {
    context (id) {
        id -> Text,
        name -> Text,
    }
}

table! {
    program (id) {
        id -> Text,
        name -> Text,
        context_id -> Text,
        master_list_id -> Text,
    }
}

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE context (
          id TEXT NOT NULL PRIMARY KEY,
          name TEXT NOT NULL
        );
        ALTER TABLE document_registry DROP COLUMN parent_id;
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
    let programs = program::dsl::program
        .select((program::dsl::id, program::dsl::name))
        .load::<(String, String)>(&connection.connection)?;

    for (program_id, program_name) in programs {
        diesel::insert_into(context::dsl::context)
            .values((
                context::dsl::id.eq(program_id),
                context::dsl::name.eq(program_name),
            ))
            .execute(&connection.connection)?;
    }

    diesel::update(program::dsl::program)
        .set(program::dsl::context_id.eq(program::dsl::id))
        .execute(&connection.connection)?;

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
            ALTER TABLE document_registry RENAME COLUMN type TO category;

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
        ALTER TABLE document_registry RENAME COLUMN type TO category;

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
    use crate::migrations::{v1_01_15::V1_01_15, Migration};
    use crate::{program_row::program, test_db::*};
    use diesel::prelude::*;

    let prev_version = V1_01_15.version();

    // test that the migration adds a context for every program
    // Migrate to version - 1
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: "migration_context_program_upgrade",
        version: Some(prev_version.clone()),
        ..Default::default()
    })
    .await;

    // Add two programs and master lists

    sql!(
        &connection,
        r#"
        INSERT INTO master_list 
        (id, name, code, description)
        VALUES 
        ('master_list_1', '', '', '');
    "#
    )
    .unwrap();

    sql!(
        &connection,
        r#"
        INSERT INTO master_list 
        (id, name, code, description)
        VALUES 
        ('master_list_2', '', '', '');
    "#
    )
    .unwrap();

    diesel::insert_into(program::dsl::program)
        .values((
            program::dsl::id.eq("program_1"),
            program::dsl::name.eq("program_1_name"),
            program::dsl::master_list_id.eq("master_list_1"),
        ))
        .execute(&connection.connection)
        .unwrap();

    diesel::insert_into(program::dsl::program)
        .values((
            program::dsl::id.eq("program_2"),
            program::dsl::name.eq("program_2_name"),
            program::dsl::master_list_id.eq("master_list_2"),
        ))
        .execute(&connection.connection)
        .unwrap();

    migrate(&connection).unwrap();

    let programs = program::dsl::program
        .select((program::dsl::id, program::dsl::name))
        .load::<(String, String)>(&connection.connection)
        .unwrap();

    assert!(!programs.is_empty());

    for (program_id, program_name) in programs {
        let context_name: String = context::dsl::context
            .select(context::dsl::name)
            .filter(context::dsl::id.eq(program_id))
            .first(&connection.connection)
            .optional()
            .unwrap()
            .unwrap();
        assert_eq!(program_name, context_name)
    }
}
