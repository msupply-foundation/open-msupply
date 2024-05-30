use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Create the name properties available for GAPS - UI to configure these may come at a later date
    sql!(
        connection,
        r#"
        INSERT INTO property (id, key, name, value_type, allowed_values) VALUES 
          ('supply_level', 'supply_level', 'Supply Level', 'STRING', 'Primary,Sub-National,Lowest Distribution,Service Point'),
          ('facility_type', 'facility_type', 'Facility Type', 'STRING', 'National Vaccine Store,Regional Vaccine Store,Referral Hospital,Municipal Warehouse,Maternal Clinic'),
          ('ownership_type', 'ownership_type', 'Ownership Type', 'STRING', 'Government,NGO,Private,Faith-based'),
          ('electricity_availability', 'electricity_availability', 'Electricity Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability'),
          ('solar_availability', 'solar_availability', 'Solar Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability'),
          ('gas_availability', 'gas_availability', 'Gas Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability'),
          ('kerosene_availability', 'kerosene_availability', 'Kerosene Availability', 'STRING', '> 16 hours,8-16 hours,< 8 hours,No availability');

        INSERT INTO name_property (id, property_id) VALUES 
          ('supply_level', 'supply_level'),
          ('facility_type', 'facility_type'),
          ('ownership_type', 'ownership_type'),
          ('electricity_availability', 'electricity_availability'),
          ('solar_availability', 'solar_availability'),
          ('gas_availability', 'gas_availability'),
          ('kerosene_availability', 'kerosene_availability');
        "#,
    )?;
    Ok(())
}
