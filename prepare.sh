#!/bin/bash

INPUT_DIR="$1"
OUTPUT_FILE="$2"

if [[ -z "$INPUT_DIR" || -z "$OUTPUT_FILE" ]]; then
    echo "Usage: $0 <input_directory> <output_file>"
    exit 1
fi

> "$OUTPUT_FILE"

find "$INPUT_DIR" -type f | while read -r file; do
    echo "===== FILE: $file =====" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n\n=====================================================\n\n" >> "$OUTPUT_FILE"
done