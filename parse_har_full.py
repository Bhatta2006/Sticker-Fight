import json

# Read HAR file
with open('Stickerly.har', 'r', encoding='utf-8') as f:
    har_data = json.load(f)

entries = har_data['log']['entries']

# Find the stickerPack/smartSearch request
for entry in entries:
    url = entry['request'].get('url', '')
    if 'stickerPack/smartSearch' in url:
        print("=== STICKERLY SEARCH API DETAILS ===\n")
        print(f"Method: {entry['request']['method']}")
        print(f"URL: {url}")
        print(f"\n--- Headers ---")
        for h in entry['request'].get('headers', []):
            print(f"{h['name']}: {h['value']}")
        
        print(f"\n--- Request Body ---")
        post_data = entry['request'].get('postData', {})
        if post_data:
            text = post_data.get('text', '{}')
            try:
                body = json.loads(text)
                print(json.dumps(body, indent=2))
            except:
                print(text)
        
        print(f"\n--- Response Preview ---")
        response = entry.get('response', {})
        print(f"Status: {response.get('status', 'N/A')}")
        print(f"Content Type: {response.get('content', {}).get('mimeType', 'N/A')}")
        text_content = response.get('content', {}).get('text', '')
        if text_content:
            try:
                resp_data = json.loads(text_content)
                print(f"Response keys: {list(resp_data.keys())}")
                if 'result' in resp_data and 'stickerPacks' in resp_data['result']:
                    print(f"Sticker packs found: {len(resp_data['result']['stickerPacks'])}")
            except:
                pass
        break
