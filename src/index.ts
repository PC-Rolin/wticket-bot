import puppeteer, { LaunchOptions } from "puppeteer";
import { WTicketBot } from "./client";

export { Ticket } from "./types"

type CreateOptions = {
  puppeteer?: LaunchOptions
  host: string
}

export async function createWTicketBot(options: CreateOptions) {
  const browser = await puppeteer.launch(options.puppeteer)
  const [page] = await browser.pages()
  return new WTicketBot({
    browser,
    page,
    host: options.host
  })
}