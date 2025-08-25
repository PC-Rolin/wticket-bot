import { parse } from "node-html-parser";
import { toXML } from "jstoxml"
import { Field, Form } from "./types";
import { XMLParser } from "fast-xml-parser";

type Options = {
  host: string
}

export class WTicketBot {
  private headers: Record<string, string> = {}

  constructor(private options: Options) {}

  private async fetch(path: string, options?: {
    method?: "GET" | "POST"
    headers?: HeadersInit
    body?: BodyInit
  }) {
    return fetch("https://" + this.options.host + path, {
      method: options?.method ?? "GET",
      headers: {
        ...options?.headers,
        ...this.headers,
      },
      body: options?.body
    })
  }

  private setSession(headers: Headers) {
    this.headers["Cookie"] = headers.getSetCookie()[0].split(';')[0]
  }

  async login(params: { username: string, password: string }) {
    const site = await this.fetch("/jsp/wf/index.jsp")
    this.setSession(site.headers)

    await this.fetch("/login?action=refreshsession", { method: "POST" })

    const body = new URLSearchParams({
      username: params.username,
      password: params.password
    })

    const response = await this.fetch("/login", { method: "POST", body })
    this.setSession(response.headers)

    if (!response.ok) {
      throw new Error(response.headers.get("message") ?? "Something went wrong")
    }
  }

  async logout() {
    await this.fetch("/login/wf/logout.jsp")
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

  private async submitForm(form: Form, fields: Field[]) {
    const body = toXML({
      _name: "form",
      _attrs: form,
      _content: fields.map(field => {
        return {
          _name: "field",
          _attrs: {
            id: field.id
          },
          _content: field.value
        }
      })
    })
    const response = await this.fetch("/IOServlet", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8"
      },
      body
    })
    const text = await response.text()

    const parser = new XMLParser()
    const xml = parser.parse(text)

    if (xml.ioservletresponse) {
      if (xml.ioservletresponse.error === "") {
        throw new Error("Form not recognized")
      } else {
        throw new Error(xml.ioservletresponse.error)
      }
    } else {
      if (xml.message.error === "") {
        return
      } else {
        throw new Error(xml.message.error)
      }
    }
  }

  private async executeAction(params: Record<string, string>) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, value)
    }

    return this.fetch("/IOServlet" + searchParams.toString(), { method: "POST" })
  }

  async addMessage(ticketId: number, options?: {
    /** Defines whether the message is an internal (I) or external (E) message */
    messageType?: "I" | "E"
    color?: "BLAUW" | "DONKER-GRIJS" | "ORANJE" | "GEEL" | "GROEN" | "PAARS" | "ROOD" | "ROZE" | "TURQUOISE"
    title?: string
    message?: string
  }) {
    const fields: Field[] = [
      { id: "messageType", value: options?.messageType ?? "I" },
      { id: "actnr_wf1act_unid", value: String(ticketId) }
    ]
    if (options?.color) fields.push({ id: "headerclass", value: options.color })
    if (options?.title) fields.push({ id: "onderwerp", value: options.title })
    if (options?.message) fields.push({ id: "bericht", value: options.message })

    await this.submitForm({ id: "wf1procesinsmsgadd", action: "15" }, fields)
  }

  async pinMessage(messageId: number) {
    await this.executeAction({
      action: "101",
      name: "wf1procesinsmsg",
      uniqueid: String(messageId)
    })
  }

  async unpinMessage(messageId: number) {
    await this.executeAction({
      action: "102",
      name: "wf1procesinsmsg",
      uniqueid: String(messageId)
    })
  }

  async listMessages(ticketId: number) {
    const html = parse(await this.request("/jsp/wf/uiform/uiform_wf1act.jsp", {
      uniqueid: String(ticketId)
    }))

    const comments = html.querySelectorAll(".comment.expanded")

    return comments.map(comment => {
      const id = Number(comment.getAttribute("id")?.replace("comment", ''))
      const internal = !!comment.querySelector(".internal")
      const timestamp = comment.querySelector(".timestamp")?.textContent!
      const author = comment.querySelector(".author")?.textContent!
      const title = comment.querySelector(".desc")?.textContent!
      const message = comment.querySelector(".message")?.innerHTML!

      return {
        id,
        messageType: internal ? "I" : "E",
        timestamp,
        author,
        title,
        message
      }
    })
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