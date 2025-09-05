import { BaseService } from "./index";
import { parse, type HTMLElement } from "node-html-parser";
import { Field } from "../types";
import { CreateMessage, SearchColumn, Ticket } from "./ticket.types";
import { SearchColumns } from "./ticket.config";
import { date } from "../utils/parser";
import { Result } from "./types";

export class TicketService extends BaseService {
  private parseTicket(unid: number, id: number, tds: HTMLElement[]): Ticket {
    return {
      unid,
      id,
      searchName: tds[2].textContent,
      description: tds[3].textContent,
      priority: Number(tds[4].textContent),
      internalPriority: Number(tds[5].textContent),
      status: tds[6].textContent === '' ? undefined : tds[6].textContent,
      administrativeStatus: tds[7].textContent === '' ? undefined : tds[7].textContent,
      plannedFrom: tds[8].textContent === '' ? undefined : date(tds[8].textContent),
      plannedUntil: tds[9].textContent === '' ? undefined : date(tds[9].textContent),
      deadline: tds[10].textContent === '' ? undefined : date(tds[10].textContent),
    }
  }

  async get(id: number): Result<Ticket> {
    try {
      const html = parse(await this.request("/jsp/atsc/UITableIFrame.jsp", {
        queryid: "wf1act",
        searchcol: "2",
        key: `_<exact>_${id}`
      }))

      const tr = html.querySelectorAll("tr").find(tr => tr.getAttribute("empty") !== "true")
      if (!tr) return { data: null, error: new Error("Ticket not found") }

      const tds = tr.querySelectorAll("td")
      const unid = Number(tr.getAttribute("unid") as string)

      return {
        data: this.parseTicket(unid, id, tds),
        error: null
      }
    } catch {
      return {
        data: null,
        error: new Error("Something went wrong")
      }
    }
  }

  async list(params?: {
    filters?: {
      column: SearchColumn
      operator: "exact" | "contains"
      value: string
    }[]
    /** @default 30 */
    limit?: number
  }) {
    try {
      const options: Record<string, string> = {
        queryid: "wf1act"
      }
      if (params?.filters) {
        const columns: number[] = []
        const keys: string[] = []
        for (const filter of params.filters) {
          columns.push(SearchColumns[filter.column])
          keys.push(`_<${filter.operator}>_${filter.value}`)
        }
        options["searchcol"] = columns.join(",")
        options["key"] = keys.join(',')
      }
      if (params?.limit) options["maxrows"] = String(params.limit)

      const html = parse(await this.request("/jsp/atsc/UITableIFrame.jsp", options))
      const trs = html.querySelectorAll("tr")

      const tickets: Ticket[] = []
      for (const tr of trs) {
        if (tr.getAttribute("empty") === "true") continue
        const tds = tr.querySelectorAll("td")
        const unid = Number(tr.getAttribute("unid")!)
        const id = Number(tds[1].textContent)

        tickets.push(this.parseTicket(unid, id, tds))
      }

      return {
        data: tickets,
        error: null
      }
    } catch {
      return {
        data: null,
        error: new Error("Something went wrong")
      }
    }

  }

  async addMessage(ticketUNID: number, options?: CreateMessage): Result<{ success: true }> {
    const fields: Field[] = [
      { id: "messageType", value: options?.messageType ?? "I" },
      { id: "actnr_wf1act_unid", value: String(ticketUNID) }
    ]
    if (options?.color) fields.push({ id: "headerclass", value: options.color })
    if (options?.title) fields.push({ id: "onderwerp", value: options.title })
    if (options?.message) fields.push({ id: "bericht", value: options.message })

    const error = await this.submitForm({ id: "wf1procesinsmsgadd", action: "15" }, fields)
    if (error) {
      return {
        data: null,
        error
      }
    } else {
      return {
        data: {
          success: true
        },
        error: null
      }
    }
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
}