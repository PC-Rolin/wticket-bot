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

  async getTicketDetailed(id: number) {
    await this.page.goto(`https://wticket-pcrolin.multitrader.nl/jsp/wf/uiform/uiform_wf1act.jsp?uniqueid=${id}`)

    const relation = await this.page.$eval("#groupRelation", div => {
      const tds = div.querySelectorAll("td")
      const link = tds[1].querySelector("a")!
      const onclick = link.getAttribute("onclick")!
      const id = Number(onclick.split("(")[1].split(")")[0])
      const strong = link.querySelectorAll("strong")

      return {
        id,
        relationNumber: Number(strong[0].textContent),
        name: strong[1].textContent,
        location: tds[3].textContent.trim()
      }
    })

    const involved = await this.page.$$eval(".users", tables => {
      return {
        inCharge: tables[0].querySelector("td")!.textContent,
        practitioners: tables[1].querySelector("td")!.textContent
      }
    })

    const comments = await this.page.$eval("#groupComments", div => {
      const comments = Array.from(div.querySelectorAll(".comment"))

      return comments.map(comment => {
        const id = Number(comment.getAttribute("id")!.replace("comment", ''))
        const desc = comment.querySelector(".desc")!
        const timestamp = comment.querySelector(".timestamp")!
        const author = comment.querySelector(".author")!
        const internal = !!comment.querySelector(".internal")
        const message = comment.querySelector(".atsc-mime-message")

        return {
          id,
          description: desc.textContent,
          timestamp: timestamp.textContent,
          author: author.textContent,
          internal,
          message: message?.innerHTML ?? null
        }
      })
    })

    return {
      id,
      relation,
      involved,
      comments: comments.map(comment => {
        const [datePart, timePart] = comment.timestamp.split(" ");
        const [day, month, year] = datePart.split("-").map(Number);
        const [hour, minute] = timePart.split(":").map(Number);
        return {
          ...comment,
          timestamp: new Date(year, month - 1, day, hour, minute)
        }
      })
    }
  }

  async getTicket(ticketNumber: number) {
    await this.page.goto(`https://wticket-pcrolin.multitrader.nl/jsp/atsc/UITableIFrame.jsp?queryid=wf1act&maxrows=1&searchcol=2&key=_%3Cexact%3E_${ticketNumber}`)

    const row = (await this.page.$$("tr"))[2]
    return row.evaluate(tr => {
      const tds = tr.querySelectorAll("td")
      return {
        id: Number(tr.getAttribute("unid")),
        number: Number(tds[1].textContent),
        searchName: tds[2].textContent,
        description: tds[3].textContent
      }
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
    await this.page.goto(`https://wticket-pcrolin.multitrader.nl/jsp/atsc/UITableIFrame.jsp?queryid=2&searchcol=2&key=_%3Cexact%3E_${relationNumber}&maxrows=1`)

    const row = (await this.page.$$("tr"))[2]
    const data = JSON.parse(await row.evaluate(tr => tr.getAttribute("data-hidden-columns") as string))
    const id = Number(data.gc1rel_unid)
    return row.$$eval("td", (tds, id) => {
      return {
        id,
        searchName: tds[0].textContent,
        relationNumber: Number(tds[1].textContent),
        shortName: tds[2].textContent,
        phone1: tds[3].textContent === "" ? null : tds[3].textContent,
        phone2: tds[10].textContent === "" ? null : tds[10].textContent,
        mobilePhone: tds[4].textContent === "" ? null : tds[4].textContent,
        name: tds[5].textContent,
        address: tds[6].textContent === "" ? null : tds[6].textContent,
        zipCode: tds[7].textContent,
        city: tds[8].textContent === "" ? null : tds[8].textContent,
        countryCode: tds[9].textContent,
      }
    }, id)
  }

  async getRelationDetailed(id: number) {
    await this.page.goto(`https://wticket-pcrolin.multitrader.nl/jsp/gc/uiform_gc1rel.jsp?uniqueid=${id}`)

    return {
      id,
      naw: {
        number: Number(await this.getInputValue("#relnr")),
        name: await this.getInputValue("#naam1") as string,
        nameAddition: await this.getInputValue("#naam2"),
        searchName: await this.getInputValue("#zoeknaam") as string,
        shortName: await this.getInputValue("#naamkort") as string,
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
        },
        other: {
          phone1: await this.getInputValue("#telnr1"),
          phone2: await this.getInputValue("#telnr2"),
          mobilePhone: await this.getInputValue("#mobnr"),
          fax: await this.getInputValue("#faxnr"),
          email: await this.getInputValue("#e_adres"),
          groups: await this.getInputValue("#gbrgrpcod"),
          website: await this.getInputValue("#website"),
          webshop: await this.getInputValue("#webshop"),
          facebook: await this.getInputValue("#facebook"),
          instagram: await this.getInputValue("#instagram"),
        }
      }
    }
  }

  getInputValue(selector: string) {
    return this.page.$eval(selector, input => input.getAttribute("value"))
  }

  async close() {
    await this.browser.close()
  }
}