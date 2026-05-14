#!/usr/bin/env python3
"""
Generate and test valid device IDs for Sticker.ly API
Format: 16-character hexadecimal string (64-bit identifier)
"""

import secrets
import string
import requests
import json


def generate_android_device_id():
    """
    Generate a valid Android device ID (ANDROID_ID format)
    16-character hex string (64-bit value)
    """
    # Generate 8 random bytes and convert to hex
    return secrets.token_hex(8)


def generate_device_id_variations():
    """Generate different variations of device IDs"""
    ids = []
    
    # Standard Android format (16 hex chars)
    for _ in range(10):
        ids.append(generate_android_device_id())
    
    # Some with patterns like the original
    # Original: 15e99bb22a8ea7b4
    base = "15e99bb22a8ea7b4"
    
    # Slight variations
    ids.append(base[:8] + secrets.token_hex(4))  # Change last 8 chars
    ids.append(secrets.token_hex(4) + base[8:])  # Change first 8 chars
    ids.append(base[:4] + secrets.token_hex(4) + base[12:])  # Change middle
    
    return ids


def test_device_id(device_id, keyword="test"):
    """Test if a device ID works with the API"""
    url = "https://api.sticker.ly/v4/stickerPack/smartSearch"
    
    headers = {
        "x-duid": device_id,
        "User-Agent": "androidapp.stickerly/3.30.1 (sdk_gphone64_x86_64; U; Android 31; en-US; us;)",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        "Host": "api.sticker.ly"
    }
    
    payload = {
        "keyword": keyword,
        "limit": 5,
        "enabledKeywordSearch": True,
        "filter": {
            "extendSearchResult": False,
            "sortBy": "RECOMMENDED",
            "languages": ["ALL"],
            "minStickerCount": 5,
            "searchBy": "ALL",
            "stickerType": "ALL"
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            packs = len(data.get('result', {}).get('stickerPacks', []))
            return True, packs, None
        else:
            return False, 0, f"HTTP {response.status_code}"
    except Exception as e:
        return False, 0, str(e)


def main():
    print("=" * 60)
    print("GENERATING AND TESTING DEVICE IDs")
    print("=" * 60)
    print(f"\nOriginal ID format: 15e99bb22a8ea7b4 (16 hex chars)")
    print(f"Pattern: 8 bytes = 16 hex characters\n")
    
    # Generate device IDs
    device_ids = generate_device_id_variations()
    
    print(f"Generated {len(device_ids)} device IDs:\n")
    
    working_ids = []
    
    for i, dev_id in enumerate(device_ids, 1):
        print(f"Testing {i}/{len(device_ids)}: {dev_id}...", end=" ")
        
        success, packs, error = test_device_id(dev_id)
        
        if success:
            print(f"✓ WORKING ({packs} packs found)")
            working_ids.append(dev_id)
        else:
            print(f"✗ FAILED: {error}")
    
    print("\n" + "=" * 60)
    print("WORKING DEVICE IDs")
    print("=" * 60)
    
    if working_ids:
        for dev_id in working_ids:
            print(f'  "{dev_id}"')
    else:
        print("  No working IDs found (may need to check rate limits)")
    
    # Also save to file
    with open('device_ids.json', 'w') as f:
        json.dump({
            "working_ids": working_ids,
            "all_generated": device_ids,
            "original": "15e99bb22a8ea7b4"
        }, f, indent=2)
    
    print(f"\nSaved to device_ids.json")
    
    # Print sample code
    print("\n" + "=" * 60)
    print("USAGE IN YOUR SCRIPT")
    print("=" * 60)
    print("""
# Add to stickerly_search.py:
import random

DEVICE_IDS = [
    "15e99bb22a8ea7b4",  # Original""")
    
    for dev_id in working_ids[:5]:
        print(f'    "{dev_id}",')
    
    print("""]

def get_random_device():
    return random.choice(DEVICE_IDS)
""")


if __name__ == "__main__":
    main()
