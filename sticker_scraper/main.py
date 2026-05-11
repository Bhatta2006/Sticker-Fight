import click
from sticker_scraper.scrapers.sticker_sites import GenericStickerScraper
from sticker_scraper.processors.csv_writer import CSVWriter
from sticker_scraper import config


@click.command()
@click.option(
    "--url", required=True, help="The URL of the website to scrape stickers from."
)
@click.option(
    "--output", default=config.OUTPUT_CSV, help="Path to the output CSV file."
)
def main(url, output):
    """
    StickerFight Scraper Entrypoint.
    Scrapes stickers from a target website url using Firecrawl and saves to CSV.
    """
    click.echo(f"Starting scraper for URL: {url}")

    scraper = GenericStickerScraper()
    records = scraper.scrape_url(url)

    if records:
        writer = CSVWriter(output_path=output)
        writer.write_stickers(records)
        click.echo(f"Successfully saved {len(records)} stickers to {output}")
    else:
        click.echo("No stickers were found or all were duplicates.")


if __name__ == "__main__":
    main()
