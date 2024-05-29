use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Create the name properties available for GAPS - UI to configure these may come at a later date
    // TODO - the rest
    sql!(
        connection,
        r#"
        INSERT INTO property (id, key, name, value_type, allowed_values) VALUES 
          ('supply_level', 'supply_level', 'Supply Level', 'STRING', 'Primary,Sub-National,Lowest Distribution,Service Point'),
          ('facility_type', 'facility_type', 'Facility Type', 'STRING', 'National Vaccine Store,Regional Vaccine Store,Referral Hospital,Municipal Warehouse,Maternal Clinic'),
          ('ownership_type', 'ownership_type', 'Ownership Type', 'STRING', 'Government,NGO,Private,Faith-based');
        INSERT INTO name_property (id, property_id) VALUES 
          ('supply_level', 'supply_level'),
          ('facility_type', 'facility_type'),
          ('ownership_type', 'ownership_type');
        "#,
    )?;
    Ok(())
}
