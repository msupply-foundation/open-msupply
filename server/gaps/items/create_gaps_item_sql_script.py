import csv
import json
from helpers import *
from gaps_insert_functions import *

item_variants_file_path = 'gaps_item_variants.csv'
output_file = 'generated/gaps_item_inserts.sql'

id_lookup_file = 'id_lookup.json'

id_lookup = {}

item_id_inserted = {}

# Load saved data
try:
    with open(id_lookup_file, 'r') as file:
        id_lookup = json.load(file)
except:
    print("No id_lookup file found, starting fresh")


# Open the output file
output_file = open(output_file, 'w')

output_file.write(create_master_list())

# Main csv processing loop
with open(item_variants_file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            ids = get_or_generate_ids(id_lookup,row)
            
            # Insert the item
            item_id = ids['item_id']
            if item_id not in item_id_inserted:
                # create item
                output_file.write(upsert_item_stmt(item_id, row))
                # add it to our dummy master list
                output_file.write(insert_master_list_line(item_id))
                item_id_inserted[item_id] = True

            # Insert the item_variant
            output_file.write(upsert_item_variant_stmt(ids['item_variant_id'], item_id, row))

            # insert the packaging variants
            output_file.write(upsert_vaccine_packaging_variant_stmt(ids['packaging_variant_1_id'], ids['item_variant_id'], row, 1))
            output_file.write(upsert_vaccine_packaging_variant_stmt(ids['packaging_variant_2_id'], ids['item_variant_id'], row, 2))
            output_file.write(upsert_vaccine_packaging_variant_stmt(ids['packaging_variant_3_id'], ids['item_variant_id'], row, 3))
            
            # # Insert the diluent (item)
            diluent_id = ids['diluent_id']
            if row['DiluentBundled'] == 'No':
                # ironically diluent 'not bundled', means we need to bundle it...
                if diluent_id not in item_id_inserted and row['DiluentBundled'] == 'No':
                    # Create the item for the diluent
                    output_file.write(upsert_diluent_stmt(diluent_id, row))
                    item_id_inserted[diluent_id] = True

                # Create the item_variant for the diluent
                output_file.write(upsert_diluent_variant_stmt(ids["diluent_variant_id"], diluent_id, row))

                # Diluent Packaging Variants
                output_file.write(upsert_diluent_packaging_variant_stmt(ids['diluent_packaging_variant_1_id'], ids['diluent_variant_id'], row, 1))
                output_file.write(upsert_diluent_packaging_variant_stmt(ids['diluent_packaging_variant_2_id'], ids['diluent_variant_id'], row, 2))
                output_file.write(upsert_diluent_packaging_variant_stmt(ids['diluent_packaging_variant_3_id'], ids['diluent_variant_id'], row, 3))           

                # Create the item_bundle
                output_file.write(upsert_item_bundle_stmt(ids["item_bundle_id"], ids["item_variant_id"], ids["diluent_variant_id"]))


# save the generated ids to a file
with open(id_lookup_file, 'w') as file:
    json.dump(id_lookup, file)