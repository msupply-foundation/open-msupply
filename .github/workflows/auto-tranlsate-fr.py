#!/usr/bin/env python3
"""
Compare keys between en/common.json and fr/common.json files.
Returns any keys that are missing from the French file along with their text values.
"""

import json
import sys
import os
from pathlib import Path
import requests
from typing import List, Dict, Any

#get auth key from enviornment variable
auth_key = os.getenv("DEEPL_AUTH_KEY")



# Use requests library to make an api call to DeepL API
def translate_text(auth_key: str, text: List[str], target_lang: str) -> Dict[str, Any]:
    """
    Translates text using the DeepL API.

    :param auth_key: Your DeepL API authentication key.
    :param
    text: A list of strings to be translated.
    :param target_lang: The target language code (e.g., 'DE' for German).
    :return: A dictionary containing the translations and detected source language.
    """
    url = "https://api-free.deepl.com/v2/translate"
    headers = {
        "Authorization": f"DeepL-Auth-Key {auth_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "target_lang": target_lang
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()  # Raise an error for bad responses
    return response.json()  


def load_json_file(file_path):
    """Load and parse a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File {file_path} not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {file_path}: {e}")
        sys.exit(1)

def compare_translation_keys(en_data, fr_data):
    """Compare keys between English and French translation files."""
    en_keys = set(en_data.keys())
    fr_keys = set(fr_data.keys())
    
    # Find missing keys in French
    missing_keys = en_keys - fr_keys
    
    return missing_keys

def main():
    if not auth_key:
        print("Error: DEEPL_AUTH_KEY environment variable is not set.")
        sys.exit(1)
    print("Starting translation key comparison...")

    # Define file paths
    en_file = Path("client/packages/common/src/intl/locales/en/common.json")
    fr_file = Path("client/packages/common/src/intl/locales/fr/common.json")
    
    # Load JSON data
    en_data = load_json_file(en_file)
    fr_data = load_json_file(fr_file)
    
    # Compare keys
    missing_keys = compare_translation_keys(en_data, fr_data)
    
    if missing_keys:
        print(f"Found {len(missing_keys)} missing keys in fr/common.json:")
        print("=" * 50)
        
        # Sort keys for consistent output
        for key in sorted(missing_keys):
            text = en_data[key]
            # call the deepL API to translate the text, then save it to the fr/common.json file
            print(f"Key: {key}")
            print(f"Text: {text}")

            translated_text = translate_text(auth_key, [text], "FR")
            if translated_text and 'translations' in translated_text:
                fr_translation = translated_text['translations'][0]['text']
                fr_data[key] = fr_translation
                print(f"Translated Text: {fr_translation}")
            else:
                print("Translation failed or no translation returned.")          
    
        # Save updated French data back to file
        with open(fr_file, 'w', encoding='utf-8') as f:
            json.dump(fr_data, f, ensure_ascii=False, indent=4)
    else:
        print("No missing keys found in fr/common.json compared to en/common.json.")


if __name__ == "__main__":
    main()
