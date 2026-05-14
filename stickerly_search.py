#!/usr/bin/env python3
"""
Sticker.ly API Search Script
Searches for sticker packs using the Sticker.ly public API
"""

import requests
import json
import sys
import argparse
from typing import Optional, List, Dict, Any


def search_stickers(
    keyword: str,
    limit: int = 30,
    sort_by: str = "RECOMMENDED",
    sticker_type: str = "ALL",
    languages: Optional[List[str]] = None,
    min_sticker_count: int = 5,
    extend_search: bool = False,
    search_by: str = "ALL",
    device_id: str = "15e99bb22a8ea7b4",
    timeout: int = 30
) -> Optional[Dict[str, Any]]:
    """
    Search for sticker packs on Sticker.ly
    
    Args:
        keyword: Search term (e.g., "kannada", "dudu bubu")
        limit: Maximum number of results (default: 30)
        sort_by: Sort order (RECOMMENDED, POPULAR, NEWEST)
        sticker_type: Filter by type (ALL, STATIC, ANIMATED)
        languages: List of language codes (default: ["ALL"])
        min_sticker_count: Minimum stickers per pack (default: 5)
        extend_search: Extend search results (default: False)
        search_by: Search scope (ALL, NAME, AUTHOR, TAG)
        device_id: Device/user ID for headers
        timeout: Request timeout in seconds
    
    Returns:
        JSON response from the API or None on error
    """
    url = "https://api.sticker.ly/v4/stickerPack/smartSearch"
    
    headers = {
        "x-duid": device_id,
        "User-Agent": "androidapp.stickerly/3.30.1 (sdk_gphone64_x86_64; U; Android 31; en-US; us;)",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        "Host": "api.sticker.ly"
    }
    
    if languages is None:
        languages = ["ALL"]
    
    payload = {
        "keyword": keyword,
        "limit": limit,
        "enabledKeywordSearch": True,
        "filter": {
            "extendSearchResult": extend_search,
            "sortBy": sort_by,
            "languages": languages,
            "minStickerCount": min_sticker_count,
            "searchBy": search_by,
            "stickerType": sticker_type
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error making request: {e}")
        return None


def save_results(data, filename):
    """Save search results to a JSON file"""
    if data:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Results saved to: {filename}")


def print_summary(data: Dict[str, Any], show_all: bool = False, max_items: int = 10):
    """
    Print a summary of the search results
    
    Args:
        data: API response data
        show_all: Show all results instead of just first 10
        max_items: Number of items to show when show_all is False
    """
    if not data or 'result' not in data:
        print("No results found or invalid response")
        return
    
    result = data['result']
    sticker_packs = result.get('stickerPacks', [])
    
    print(f"\n=== Search Results ===")
    print(f"Found {len(sticker_packs)} sticker packs\n")
    
    items_to_show = len(sticker_packs) if show_all else min(max_items, len(sticker_packs))
    
    for i, pack in enumerate(sticker_packs[:items_to_show], 1):
        print(f"{i}. {pack.get('name', 'N/A')} (by {pack.get('authorName', 'N/A')})")
        print(f"   Pack ID: {pack.get('packId', 'N/A')}")
        print(f"   Share URL: {pack.get('shareUrl', 'N/A')}")
        print(f"   Stickers: {len(pack.get('resourceFiles', []))}")
        print(f"   Views: {pack.get('viewCount', 0)} | Exports: {pack.get('exportCount', 0)}")
        print(f"   Animated: {pack.get('isAnimated', False)}")
        print()
    
    if not show_all and len(sticker_packs) > max_items:
        print(f"... and {len(sticker_packs) - max_items} more (use --all to see all results)")


def create_parser() -> argparse.ArgumentParser:
    """Create and return the argument parser"""
    parser = argparse.ArgumentParser(
        description="Search for sticker packs on Sticker.ly",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s kannada
  %(prog)s "dudu bubu" -l 50
  %(prog)s anime -t ANIMATED -s POPULAR
  %(prog)s meme --all -o my_memes.json
  %(prog)s "hello world" --limit 100 --sort-by NEWEST
        """
    )
    
    # Positional argument
    parser.add_argument(
        "keyword",
        nargs="?",
        help="Search term/keyword (e.g., 'kannada', 'anime', 'meme')"
    )
    
    # Search options
    parser.add_argument(
        "-l", "--limit",
        type=int,
        default=30,
        help="Maximum number of results (default: 30)"
    )
    parser.add_argument(
        "-s", "--sort-by",
        choices=["RECOMMENDED", "POPULAR", "NEWEST"],
        default="RECOMMENDED",
        help="Sort order: RECOMMENDED, POPULAR, or NEWEST (default: RECOMMENDED)"
    )
    parser.add_argument(
        "-t", "--sticker-type",
        choices=["ALL", "STATIC", "ANIMATED"],
        default="ALL",
        help="Filter by sticker type: ALL, STATIC, or ANIMATED (default: ALL)"
    )
    parser.add_argument(
        "--search-by",
        choices=["ALL", "NAME", "AUTHOR", "TAG"],
        default="ALL",
        help="Search scope: ALL, NAME, AUTHOR, or TAG (default: ALL)"
    )
    parser.add_argument(
        "--min-sticker-count",
        type=int,
        default=5,
        help="Minimum stickers per pack (default: 5)"
    )
    parser.add_argument(
        "--extend-search",
        action="store_true",
        help="Extend search results"
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        default=["ALL"],
        help="Language codes (default: ALL)"
    )
    
    # Output options
    parser.add_argument(
        "-o", "--output",
        help="Output JSON filename (default: search_<keyword>.json)"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        dest="show_all",
        help="Show all results in summary (not just first 10)"
    )
    parser.add_argument(
        "--no-summary",
        action="store_true",
        help="Skip printing summary to console"
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Don't save results to file"
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        default=True,
        help="Pretty print JSON output (default: True)"
    )
    parser.add_argument(
        "--compact",
        action="store_false",
        dest="pretty",
        help="Compact JSON output (no indentation)"
    )
    
    # Advanced options
    parser.add_argument(
        "--device-id",
        default="15e99bb22a8ea7b4",
        help="Device ID for API headers (default: 15e99bb22a8ea7b4)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Request timeout in seconds (default: 30)"
    )
    
    return parser


def main():
    """Main entry point"""
    parser = create_parser()
    args = parser.parse_args()
    
    # Get keyword
    if args.keyword:
        keyword = args.keyword
    else:
        keyword = input("Enter search term (e.g., 'kannada'): ").strip()
    
    if not keyword:
        print("Error: Please provide a search term", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
    
    print(f"Searching for: '{keyword}'...")
    print(f"  Limit: {args.limit} | Sort: {args.sort_by} | Type: {args.sticker_type}")
    
    # Make the API call
    results = search_stickers(
        keyword=keyword,
        limit=args.limit,
        sort_by=args.sort_by,
        sticker_type=args.sticker_type,
        languages=args.languages,
        min_sticker_count=args.min_sticker_count,
        extend_search=args.extend_search,
        search_by=args.search_by,
        device_id=args.device_id,
        timeout=args.timeout
    )
    
    if not results:
        print("Error: Failed to get results", file=sys.stderr)
        sys.exit(1)
    
    # Print summary
    if not args.no_summary:
        print_summary(results, show_all=args.show_all)
    
    # Save to file
    if not args.no_save:
        if args.output:
            filename = args.output
        else:
            # Sanitize filename
            safe_keyword = keyword.replace(' ', '_').replace('/', '_').replace('\\', '_')
            filename = f"search_{safe_keyword}.json"
        
        indent = 2 if args.pretty else None
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=indent, ensure_ascii=False)
        print(f"Results saved to: {filename}")


if __name__ == "__main__":
    main()
