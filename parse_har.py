import json
import re

# Read HAR file
with open('Stickerly.har', 'r', encoding='utf-8') as f:
    har_data = json.load(f)

# Find all entries
entries = har_data['log']['entries']

# Look for search-related requests
search_entries = []
for entry in entries:
    url = entry['request'].get('url', '')
    method = entry['request'].get('method', '')
    
    # Look for search patterns
    if any(kw in url.lower() for kw in ['search', 'query', 'nsearch', 'kannada', 'find']):
        search_entries.append({
            'method': method,
            'url': url,
            'headers': entry['request'].get('headers', []),
            'postData': entry['request'].get('postData', {})
        })

print(f"Found {len(search_entries)} search-related entries:\n")

for i, entry in enumerate(search_entries[:10]):  # Show first 10
    print(f"--- Entry {i+1} ---")
    print(f"Method: {entry['method']}")
    print(f"URL: {entry['url'][:200]}...")
    print(f"Headers: {[h for h in entry['headers'] if any(k in h.get('name','').lower() for k in ['auth', 'token', 'api', 'key'])]}")
    if entry['postData']:
        print(f"Post Data: {entry['postData']}")
    print()
