import json
import csv
import os

# Read the JSON file
json_path = 'kannada.json'
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Prepare CSV data
csv_rows = []
csv_rows.append(['pack_id', 'share_url', 'sha', 'file_name', 'full_url'])

# Extract data from each sticker pack
for pack in data['result']['stickerPacks']:
    pack_id = pack.get('packId', '')
    share_url = pack.get('shareUrl', '')
    resource_prefix = pack.get('resourceUrlPrefix', '')
    
    for filename in pack.get('resourceFiles', []):
        # Extract SHA from filename (remove extension)
        sha = os.path.splitext(filename)[0]
        # Construct full URL
        full_url = f"{resource_prefix}{filename}" if resource_prefix else ''
        
        csv_rows.append([pack_id, share_url, sha, filename, full_url])

# Write to CSV
csv_path = 'kannada_links_sha.csv'
with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerows(csv_rows)

print(f"Created CSV with {len(csv_rows) - 1} records: {csv_path}")
