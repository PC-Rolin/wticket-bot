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
          number: Number(raw.instnr),
          description: raw.ins_omschr
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

  async getRelation(relationNumber: number) {
    const id = await this.getRelationId(relationNumber)
    await this.page.goto(`https://wticket-pcrolin.multitrader.nl/jsp/gc/uiform_gc1rel.jsp?uniqueid=${id}`)

    return {
      id,
      naw: {
        number: Number(await this.getInputValue("#relnr")),
        name: await this.getInputValue("#naam1"),
        nameAddition: await this.getInputValue("#naam2"),
        searchName: await this.getInputValue("#zoeknaam"),
        shortName: await this.getInputValue("#naamkort"),
        invoiceName: await this.getInputValue("#tavnaam"),
        establishment: {
          street: await this.getInputValue("#straat"),
          houseNumber: Number(await this.getInputValue("#huisnr")),
          addition: await this.getInputValue("#toevoeging"),
          address2: await this.getInputValue("#adres2"),
          addition2: await this.getInputValue("#toevoeging2"),
          zipCode: await this.getInputValue("#postcod"),
          place: await this.getInputValue("#plaats"),
          province: await this.getInputValue("#provincie"),
          countryCode: await this.getInputValue("#landcod"),
          country: await this.getInputValue("#land")
        },
        mail: {
          street: await this.getInputValue("#p_straat"),
          houseNumber: Number(await this.getInputValue("#p_huisnr")),
          addition: await this.getInputValue("#p_toevoeging"),
          address2: await this.getInputValue("#p_adres2"),
          addition2: await this.getInputValue("#p_toevoeging2"),
          zipCode: await this.getInputValue("#p_postcod"),
          place: await this.getInputValue("#p_plaats"),
          province: await this.getInputValue("#p_provincie"),
          countryCode: await this.getInputValue("#p_landcod"),
          country: await this.getInputValue("#p_land")
        }
      }
    }
  }

  getInputValue(selector: string) {
    return this.page.$eval(selector, input => input.getAttribute("value") as string)
  }

  async getRelationId(relationNumber: number) {
    await this.page.goto("https://wticket-pcrolin.multitrader.nl/jsp/wf/index.jsp")

    const frame = await this.page.$("#wmain").then(el => el?.contentFrame() ?? null)
    if (frame) {
      await frame.type("#searchfield", String(relationNumber))
      await this.page.waitForNetworkIdle()

      const entityItem = await frame.$(".entityItem")
      if (entityItem) {
        const link = await entityItem.$(".link")
        if (link) {
          const dataAction = await link.evaluate(div => div.getAttribute("data-action"))
          if (dataAction) {
            const split = dataAction.split('=')
            return Number(split[split.length - 1])
          } else {
            throw new Error("Couldn't find data-action")
          }
        } else {
          throw new Error("Couldn't find link")
        }
      } else {
        throw new Error("Couldn't find entityItem")
      }
    } else {
      throw new Error("Couldn't find main frame")
    }
  }

  async close() {
    await this.browser.close()
  }
}