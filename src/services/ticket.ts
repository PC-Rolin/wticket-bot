import { BaseService } from "./index";
import { parse } from "node-html-parser";
import { Field } from "../types";

export class TicketService extends BaseService {
  async get(ticketNumber: number) {
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
}