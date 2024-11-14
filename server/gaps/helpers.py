import uuid


# A python function to create a cold_storage_type_id lookup query based on the 
# VaccineStorageTemperature one of `2-8°C`, `-20°C`, `-70°C`
def cold_storage_type_id_lookup(storage_temp):
    if storage_temp == '2-8°C':
        return '(SELECT id FROM cold_storage_type WHERE name = \'+5\' or min_temperature = 2 and max_temperature = 8 LIMIT 1)'
    elif storage_temp == '-20°C':
        return '(SELECT id FROM cold_storage_type WHERE name = \'-20\' or min_temperature = -20 and max_temperature = -20 LIMIT 1)'
    elif storage_temp == '-70°C':
        return '(SELECT id FROM cold_storage_type WHERE name = \'-70\' or min_temperature = -70 and max_temperature = -70 LIMIT 1)'
    else:
        return 'null'
