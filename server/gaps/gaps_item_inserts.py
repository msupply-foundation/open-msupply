import csv
import json
from helpers import *
from gaps_insert_functions import *

item_variants_file_path = 'gaps_item_variants.csv'

id_lookup_file = 'id_lookup.json'

id_lookup = {}

item_id_inserted = {}

# Load saved data
with open(id_lookup_file, 'r') as file:
    id_lookup = json.load(file)


create_master_list()

# Main csv processing loop
with open(item_variants_file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            pqs_vaccine_id = row['PQSVaccineID']
            ids = get_or_generate_ids(id_lookup,row)
            
            # Insert the item
            item_id = ids['item_id']
            if item_id not in item_id_inserted:
                upsert_item_stmt(item_id, row)
                print(insert_master_list_line(item_id))
                item_id_inserted[item_id] = True

            # Insert the item_variant
            upsert_item_variant_stmt(ids['item_variant_id'], item_id, row)

            # insert the packaging variants
            upsert_vaccine_packaging_variant_stmt(ids['packaging_variant_1_id'], ids['item_variant_id'], row, 1)
            upsert_vaccine_packaging_variant_stmt(ids['packaging_variant_2_id'], ids['item_variant_id'], row, 2)
            upsert_vaccine_packaging_variant_stmt(ids['packaging_variant_3_id'], ids['item_variant_id'], row, 3)
            
            # # Insert the diluent (item)
            diluent_id = ids['diluent_id']
            if row['DiluentBundled'] == 'No':
                # ironically diluent 'not bundled', means we need to bundle it...
                if diluent_id not in item_id_inserted and row['DiluentBundled'] == 'No':
                    upsert_diluent_stmt(diluent_id, row)
                    item_id_inserted[diluent_id] = True
                    # Create the item_variant for the diluent
                    upsert_diluent_variant_stmt(ids["diluent_variant_id"], diluent_id, row)

                    # Diluent Packaging Variants
                    upsert_diluent_packaging_variant_stmt(ids['diluent_packaging_variant_1_id'], ids['diluent_variant_id'], row, 1)
                    upsert_diluent_packaging_variant_stmt(ids['diluent_packaging_variant_2_id'], ids['diluent_variant_id'], row, 2)
                    upsert_diluent_packaging_variant_stmt(ids['diluent_packaging_variant_3_id'], ids['diluent_variant_id'], row, 3)            

                    # Create the item_bundle
                    upsert_item_bundle_stmt(ids["item_bundle_id"], ids["item_variant_id"], ids["diluent_variant_id"])


# save the generated ids to a file
with open(id_lookup_file, 'w') as file:
    json.dump(id_lookup, file)