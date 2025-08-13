import { Browser, Page } from "puppeteer";
import { RawTicket, Ticket } from "./types";

export class WTicketScraper {
  private browser: Browser
  private page: Page

  constructor(puppeteer: {
    browser: Browser
    page: Page
  }) {
    this.browser = puppeteer.browser
    this.page = puppeteer.page

    this.page.on("dialog", dialog => {
      dialog.type() === "beforeunload" && dialog.accept()
    })
  }

  async isLoggedIn() {
    await this.page.goto("https://wticket-pcrolin.multitrader.nl/jsp/wf/index.jsp")
    return !(await this.page.title() === "WTicket")
  }

  async login(credentials: {
    username: string
    password: string
  }) {
    if (await this.isLoggedIn()) return

    await this.page.type("#username", credentials.username)
    await this.page.type("#password", credentials.password)
    const buttons = await this.page.$$("a.atsc-button")
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent.trim())
      if (text === "Login") {
        await button.click()
        await this.page.waitForNetworkIdle()
        if (await this.isLoggedIn()) {
          return
        } else {
          await this.page.click("#remove_session_0")
          await this.page.click("#remove_session_1")
          await this.page.click("#remove_session_1")
          await button.click()
          await this.page.waitForNetworkIdle()
          if (await this.isLoggedIn()) {
            return
          } else {
            throw new Error("Failed to login")
          }
        }
      }
    }
  }

  async logout() {
    await this.page.goto("https://wticket-pcrolin.multitrader.nl/login/wf/logout.jsp")
    await this.page.waitForNetworkIdle()
  }

  async listTickets() {
    return this.listTicketsRaw().then(tickets => {
      return tickets.map(raw => {
        const ticket: Ticket = {
          id: Number(raw.wf1act_unid),
          number: Number(raw.instnr)
        }
        return ticket
      })
    })
  }

  async listTicketsRaw() {
    await this.page.goto("https://wticket-pcrolin.multitrader.nl/jsp/atsc/UITableIFrame.jsp?queryid=wf1act")

    return await this.page.$$eval("tr", trs => {
      const tickets: RawTicket[] = []
      for (const tr of trs) {
        if (tr.getAttribute("unid")) {
          const ticket = JSON.parse(String(tr.getAttribute("data-hidden-columns"))) as RawTicket
          tickets.push(ticket)
        }
      }
      return tickets
    })
  }

  async close() {
    await this.browser.close()
  }
}