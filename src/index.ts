import puppeteer, { LaunchOptions } from "puppeteer";
import { WTicketScraper } from "./client";

export async function createWTicketScraper(options?: {
  puppeteer?: LaunchOptions
}) {
  const browser = await puppeteer.launch(options?.puppeteer)
  const page = await browser.newPage()
  return new WTicketScraper({
    browser,
    page
  })
}