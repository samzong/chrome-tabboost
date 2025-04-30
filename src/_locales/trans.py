import json
import os
import time

from googletrans import Translator

SOURCE_LANG = 'en'
SOURCE_DIR = SOURCE_LANG
SOURCE_FILENAME = 'messages.json'
TRANSLATION_DELAY = 0.1

def translate_file(target_lang):
    source_file_path = os.path.join(SOURCE_DIR, SOURCE_FILENAME)
    output_dir = target_lang
    output_file_path = os.path.join(output_dir, SOURCE_FILENAME)

    # Check if source file exists
    if not os.path.exists(source_file_path):
        print(f"Error: Source file '{source_file_path}' not found.")
        return

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Initialize translator
    translator = Translator()

    # Read source JSON data
    try:
        with open(source_file_path, 'r', encoding='utf-8') as f:
            source_data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse source file '{source_file_path}': {e}")
        return
    except Exception as e:
        print(f"Error: Unknown error reading source file '{source_file_path}': {e}")
        return

    translated_data = {}
    total_keys = len(source_data)
    translated_count = 0

    print(f"Starting translation of {total_keys} items to '{target_lang}'...")

    for key, value in source_data.items():
        original_message = value.get('message')
        translated_message = original_message

        if original_message and isinstance(original_message, str):
            try:
                translation = translator.translate(original_message, src=SOURCE_LANG, dest=target_lang)
                translated_message = translation.text
                translated_count += 1
                print(f"[{translated_count}/{total_keys}] Translated '{key}': '{original_message}' -> '{translated_message}'")
                time.sleep(TRANSLATION_DELAY)
            except Exception as e:
                print(f"  ! Error translating key '{key}': {e}. Using original message.")
        elif original_message:
            print(f"  ? Skipping non-string message for key: '{key}', value: {original_message}")
        else:
            print(f"  ? Skipping key with no message: '{key}'")

        new_value = value.copy()
        new_value['message'] = translated_message
        translated_data[key] = new_value

    try:
        with open(output_file_path, 'w', encoding='utf-8') as f:
            json.dump(translated_data, f, ensure_ascii=False, indent=2)
        print(f"Translation finished! Successfully translated {translated_count}/{total_keys} items.")
        print(f"Results saved to '{output_file_path}'.")
    except Exception as e:
        print(f"Error: Failed to write translated file '{output_file_path}': {e}")

if __name__ == "__main__":
    target_language = input("Please enter the target language code (e.g., de, fr, es, ja, ko, zh_CN, zh_TW): ").strip().lower()
    if target_language:
        translate_file(target_language)
    else:
        print("Error: No target language code provided.")