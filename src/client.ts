import puppeteer, { LaunchOptions } from "puppeteer";
import parse from "node-html-parser";

type Options = {
  puppeteer?: LaunchOptions
  host: string
}

export class WTicketBot {
  private headers: Record<string, string> = {}

  constructor(private options: Options) {}

  async login(credentials: {
    username: string
    password: string
  }) {
    const browser = await puppeteer.launch(this.options.puppeteer)
    const [page] = await browser.pages()

    await page.goto(`https://${this.options.host}/jsp/wf/index.jsp`, {
      waitUntil: "networkidle2"
    })

    await page.type("#username", credentials.username)
    await page.type("#password", credentials.password)

    const buttons = await page.$$("a.atsc-button")
    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent)
      if (text === "Login") {
        await button.click()
        break
      }
    }

    try {
      await page.waitForNavigation({ waitUntil: "networkidle2" })
    } catch {
      throw new Error("Login failed");
    }

    this.headers["Cookie"] = (await page.browserContext().cookies()).map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
    await browser.close();
  }

  async logout() {
    await fetch("https://wticket-pcrolin.multitrader.nl/login/wf/logout.jsp", {
      headers: this.headers
    })
  }

  private async request(path: string, options: Record<string, string>) {
    const url = new URL(`https://${this.options.host}${path}`)
    for (const [key, value] of Object.entries(options)) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url, {
      headers: this.headers
    })

    return await response.text()
  }

  async listStaff() {
    const html = parse(await this.request("/jsp/atsc/UITableIFrame.jsp", {
      queryid: "wf1medewerkers"
    }))

    const trs = html.querySelectorAll("tr")

    const staff = trs.map(tr => {
      const i = trs.indexOf(tr)
      if (i === 0 || i === 1) return null
      if (tr.getAttribute("empty") === "true") return null

      const id = Number(tr.getAttribute("unid") as string)
      const tds = tr.querySelectorAll("td")

      return {
        id,
        staffCode: tds[0].textContent,
        name: tds[1].textContent,
        tasks: Number(tds[2].textContent)
      }
    }).filter(value => value !== null)

    const td = html.querySelector("#sc3")!
    return {
      totalTasks: Number(td.innerHTML),
      staff
    }
  }

  async listTicketsOfStaff(staffId: number) {
    const html = parse(await this.request("/jsp/atsc/UITableIFrame.jsp", {
      queryid: "wf1actlopend",
      foreignUNIDName: "_<arrayoverlaps>_uitvoerder_gc1mdw_unid",
      foreignUNIDValue: staffId.toString()
    }))

    const trs = html.querySelectorAll("tr")

    return trs.map(tr => {
      const i = trs.indexOf(tr)
      if (i === 0 || i === 1) return null
      if (tr.getAttribute("empty") === "true") return null

      const id = Number(tr.getAttribute("unid") as string)
      const tds = tr.querySelectorAll("td")

      return {
        id,
        ticketNumber: Number(tds[1].textContent),
        searchName: tds[2].textContent,
        description: tds[3].textContent
      }
    }).filter(value => value !== null)
  }

  async getTicket(ticketNumber: number) {
    const html = parse(await this.request("/jsp/atsc/UITableIFrame.jsp", {
      queryid: "wf1act",
      searchcol: "2",
      key: `_<exact>_${ticketNumber}`
    }))

    const tr = html.querySelectorAll("tr").find(tr => tr.getAttribute("empty") !== "true")
    if (!tr) throw new Error("Ticket not found")

    const tds = tr.querySelectorAll("td")
    const id = Number(tr.getAttribute("unid") as string)

    return {
      id,
      number: Number(tds[1].textContent),
      searchName: tds[2].textContent,
      description: tds[3].textContent
    }
  }
}