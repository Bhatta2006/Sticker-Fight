import csv
import os
from threading import Lock
from typing import List
from sticker_scraper.models import StickerRecord
from sticker_scraper import config


class CSVWriter:
    def __init__(self, output_path: str = config.OUTPUT_CSV):
        self.output_path = output_path
        self._lock = Lock()
        self.fieldnames = list(StickerRecord.model_fields.keys())

        # Ensure directory exists
        os.makedirs(os.path.dirname(os.path.abspath(self.output_path)), exist_ok=True)

        # Write header if file does not exist
        if not os.path.exists(self.output_path):
            with open(
                self.output_path, mode="w", encoding="utf-8-sig", newline=""
            ) as f:
                writer = csv.DictWriter(f, fieldnames=self.fieldnames)
                writer.writeheader()

    def write_stickers(self, records: List[StickerRecord]):
        with self._lock:
            with open(
                self.output_path, mode="a", encoding="utf-8-sig", newline=""
            ) as f:
                writer = csv.DictWriter(f, fieldnames=self.fieldnames)
                for record in records:
                    writer.writerow(record.model_dump())
