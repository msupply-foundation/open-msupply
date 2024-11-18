
from helpers import cold_storage_type_id_lookup


def changelog_stmt(record_id, table_name):
    # Thank you to whoever set the default value of cursor in ChangeLog to properly generate the next value!
    # nextval('changelog_cursor_seq'::regclass)
    return f"INSERT INTO changelog (record_id, table_name, row_action) VALUES ('{record_id}', '{table_name}', 'UPSERT');"


def item_link_stmt(item_id):
    return f"INSERT INTO item_link (id, item_id) VALUES ('{item_id}', '{item_id}') ON CONFLICT DO NOTHING;"

def upsert_item_stmt(item_id, row):
    item_name = row['VaccineType']
    item_code = row['VaccineTypeName']
    ven_category = "NOT_ASSIGNED"
    item_type = "STOCK"
    legacy_record = ""
    is_active = True
    is_vaccine = True
    vaccine_doses = 1 # default, the variants will have the actual dose count

    # Insert the item
    insert_statement = (f"INSERT INTO item (id, name, code, ven_category, type, legacy_record, is_active, is_vaccine, vaccine_doses, default_pack_size)"
                        f" VALUES ('{item_id}', '{item_name}', '{item_code}', '{ven_category}', '{item_type}', '{legacy_record}', '{is_active}', '{is_vaccine}', {vaccine_doses}, 1)"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)
    print(item_link_stmt(item_id))

    #Insert the changelog
    print(changelog_stmt(item_id, 'item'))

    return insert_statement

def upsert_diluent_stmt(item_id, row):
    item_name = row['VaccineTypeName'] + " Diluent"
    item_code = row['VaccineTypeName'] + "_DILUENT"
    ven_category = "NOT_ASSIGNED"
    item_type = "STOCK"
    legacy_record = ""
    is_active = True
    is_vaccine = False
    vaccine_doses = 0

    # Insert the item
    insert_statement = (f"INSERT INTO item (id, name, code, ven_category, type, legacy_record, is_active, is_vaccine, vaccine_doses, default_pack_size)"
                        f" VALUES ('{item_id}', '{item_name}', '{item_code}', '{ven_category}', '{item_type}', '{legacy_record}', '{is_active}', '{is_vaccine}', {vaccine_doses}, 1)"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)
    print(item_link_stmt(item_id))

    #Insert the changelog
    print(changelog_stmt(item_id, 'item'))

    return insert_statement

def upsert_item_variant_stmt(item_variant_id, item_id, row):
    item_variant_name = row['VaccineTypeName'] + " " + row['CommercialName']
    if row['VaccineTypeName'] == row['CommercialName']:
        item_variant_name = row['VaccineTypeName']
    item_link_id = item_id
    cold_storage_type_id = cold_storage_type_id_lookup(row['VaccineStorageTemperature'])
    vaccine_doses = row['DosesCount']
    vaccine_doses = int(vaccine_doses) if vaccine_doses else 1

    # Insert the item_variant
    insert_statement = (f"INSERT INTO item_variant "
                        "(id, name, item_link_id, cold_storage_type_id, doses_per_unit)"
                        f" VALUES ('{item_variant_id}', '{item_variant_name}', '{item_link_id}', {cold_storage_type_id}, {vaccine_doses})"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)

    #Insert the changelog
    print(changelog_stmt(item_variant_id, 'item_variant'))

    return insert_statement

def upsert_diluent_variant_stmt(diluent_variant_id, diluent_item_id, row):
    item_variant_name = row['VaccineTypeName'] + " " + row['CommercialName'] + " Diluent"
    if row['VaccineTypeName'] == row['CommercialName']:
        item_variant_name = row['VaccineTypeName'] + " Diluent"
    item_link_id = diluent_item_id
    cold_storage_type_id = cold_storage_type_id_lookup(row['VaccineStorageTemperature'])
    vaccine_doses = row['DosesCount']
    vaccine_doses = int(vaccine_doses) if vaccine_doses else 1

    # Insert the item_variant
    insert_statement = (f"INSERT INTO item_variant "
                        "(id, name, item_link_id, cold_storage_type_id, doses_per_unit)"
                        f" VALUES ('{diluent_variant_id}', '{item_variant_name}', '{item_link_id}', {cold_storage_type_id}, {vaccine_doses})"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)

    #Insert the changelog
    print(changelog_stmt(diluent_variant_id, 'item_variant'))

    return insert_statement


def upsert_item_bundle_stmt(item_bundle_id, item_id, diluent_id):
    insert_statement = (f"INSERT INTO bundled_item (id, principal_item_variant_id, bundled_item_variant_id, ratio)"
                        f" VALUES ('{item_bundle_id}', '{item_id}', '{diluent_id}', 1)"
                        f" ON CONFLICT DO NOTHING;") # For now we just won't update, so only new items will be inserted
    print(insert_statement)

    #Insert the changelog
    print(changelog_stmt(item_bundle_id, 'bundled_item'))

    return insert_statement


def insert_master_list_line(item_id):
    return f"INSERT INTO master_list_item (id, master_list_id, item_id) VALUES (uuid_in(md5(random()::text || random()::text)::cstring), '43491ce9-bc89-4ee5-988d-9dbb2856e398', '{item_id}') ON CONFLICT DO NOTHING;"



def get_packaging_variant_name(packaging_level):
    if packaging_level == 1:
        return "Primary"
    elif packaging_level == 2:
        return "Secondary"
    elif packaging_level == 3:
        return "Tertiary"
    else:
        return "Unknown"



def upsert_vaccine_packaging_variant_stmt(packaging_variant_id, item_variant_id, row, packaging_level):  
    packaging_name = get_packaging_variant_name(packaging_level)
    volume_per_unit = 0
    if packaging_level == 1:
        volume_per_unit= row["VaccinePrimaryVolume"]
    elif packaging_level == 2:
        volume_per_unit= row["VaccineSecondaryVolume"]
    elif packaging_level == 3:
        volume_per_unit= row["VaccineTertiaryVolume"]
    else:
        volume_per_unit = 0

    if volume_per_unit == "":
        volume_per_unit = 0

    print(f"INSERT INTO packaging_variant (id, item_variant_id, name, packaging_level, volume_per_unit) VALUES ('{packaging_variant_id}', '{item_variant_id}', '{packaging_name}', {packaging_level}, {volume_per_unit}) ON CONFLICT DO NOTHING;")

    
def upsert_diluent_packaging_variant_stmt(packaging_variant_id, item_variant_id, row, packaging_level):  
    packaging_name = get_packaging_variant_name(packaging_level)
    volume_per_unit = 0
    if packaging_level == 1:
        volume_per_unit= row["DiluentPrimaryVolume"]
    elif packaging_level == 2:
        volume_per_unit= row["DiluentSecondaryVolume"]
    elif packaging_level == 3:
        volume_per_unit= row["DiluentTertiaryVolume"]
    else:
        volume_per_unit = 0

    if volume_per_unit == "":
        volume_per_unit = 0

    print(f"INSERT INTO packaging_variant (id, item_variant_id, name, packaging_level, volume_per_unit) VALUES ('{packaging_variant_id}', '{item_variant_id}', '{packaging_name}', {packaging_level}, {volume_per_unit}) ON CONFLICT DO NOTHING;")

    


