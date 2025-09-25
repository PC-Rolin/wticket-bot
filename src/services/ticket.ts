import { BaseService } from "./index";
import { parse, type HTMLElement } from "node-html-parser";
import { Field } from "../types";
import { CreateMessage, SearchColumn, Ticket } from "./ticket.types";
import { SearchColumns } from "./ticket.config";
import { Result } from "./types";
import { z } from "zod";

function localeDate(date: string) {
  const [day, month, year] = date.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day))
}

const TicketSchema = z.object({
  unid: z.number(),
  id: z.number(),
  searchName: z.string(),
  description: z.string(),
  priority: z.coerce.number(),
  internalPriority: z.coerce.number(),
  status: z.string().optional(),
  administrativeStatus: z.string().optional(),
  plannedFrom: z.preprocess(value => {
    if (typeof value === "string" && value.length > 0) {
      return localeDate(value)
    }
    return
  }, z.date().optional()),
  plannedUntil: z.preprocess(value => {
    if (typeof value === "string" && value.length > 0) {
      return localeDate(value)
    }
    return
  }, z.date().optional()),
  deadline: z.coerce.date().optional(),
})

export class TicketService extends BaseService {
  private parseTicket(unid: number, id: number, tds: HTMLElement[]): Ticket {
    return TicketSchema.parse({
      unid,
      id,
      searchName: tds[2].textContent,
      description: tds[3].textContent,
      priority: tds[4].textContent,
      internalPriority: tds[5].textContent,
      status: tds[6].textContent,
      administrativeStatus: tds[7].textContent,
      plannedFrom: tds[8].textContent,
      plannedUntil: tds[9].textContent,
      deadline: tds[10].textContent,
    })
  }

  async get(id: number): Result<Ticket> {
    const result = await this.list({
      filters: {
        id: {
          operator: "exact",
          value: String(id)
        }
      }
    })
    if (result.error) return { data: null, error: result.error }
    if (result.data.length === 0) return { data: null, error: new Error("Ticket not found") }
    return {
      data: result.data[0],
      error: null
    }
  }


  async list(params?: {
    filters?: Partial<{
      [C in SearchColumn]: {
        operator: "exact" | "contains"
        value: string
      }
    }>
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
        for (const filter of Object.keys(params.filters) as (keyof typeof params.filters)[]) {
          columns.push(SearchColumns[filter])
          keys.push(`_<${params.filters[filter]!.operator}>_${params.filters[filter]!.value}`)
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

        try {
          tickets.push(this.parseTicket(unid, id, tds))
        } catch (error) {
          console.log(error)
          return {
            data: null,
            error: new Error(`Failed to parse ticket ${id}`)
          }
        }
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

  async update() {
    await this.fetch("/jsp/wf/uiform/uiform_wf1act_edit.jsp?mode=2&uniqueid=1743211873359")

    const fields: Field[] = [
      { id: "ins_omschr", value: "RolinPortal Test Bot" },
      { id: "ins_nr", value: "285862" },
      { id: "relgrp", value: "" },
      { id: "relgrp_gc1relgrp_unid", value: "" },
      { id: "actiedat", value: "29-03-2025" },
      { id: "actietijd", value: "15:46" },
      { id: "werkbegindat", value: "29-03-2025" },
      { id: "werkbegintijd", value: "15:46" },
      { id: "werkeinddat", value: "" },
      { id: "werkeindtijd", value: "" },
      { id: "planbegindat", value: "29-03-2025" },
      { id: "planbegintijd", value: "15:46" },
      { id: "alarmind", value: "N" },
      { id: "alarmtijd", value: "" },
      { id: "pushind", value: "N" },
      { id: "planeinddat", value: "03-04-2025" },
      { id: "planeindtijd", value: "23:59" },
      { id: "planningalarmtijd", value: "0,00" },
      { id: "notifydat", value: "19-09-2025" },
      { id: "notifycount", value: "" },
      { id: "fataledat", value: "01-09-2026" },
      { id: "fataletijd", value: "" },
      { id: "fatalealarmtijd", value: "2,00" },
      { id: "delegeerbaarind", value: "J" },
      { id: "status", value: "" },
      { id: "status_omschr", value: "" },
      { id: "type", value: "DECISION" },
      { id: "parentins", value: "1743211873355" },
      { id: "parentins_wf1procesins_unid", value: "1743211873355" },
      { id: "record", value: "" },
      { id: "record_cmsfrm_unid", value: "" },
      { id: "parentdef", value: "1656634504535" },
      { id: "parentdef_wf1procesdef_unid", value: "" },
      { id: "stateid", value: "1467208052845" },
      { id: "statesrt", value: "V" },
      { id: "admstat", value: "" },
      { id: "calcod", value: "" },
      { id: "calcod_pb1cal_unid", value: "" },
      { id: "vervallenind", value: "N" },
      { id: "memo1", value: "" },
      { id: "memo2", value: "" },
      { id: "bijlage", value: "" },
      { id: "bijlage_sysfls_unids", value: "" },
      { id: "invmdw", value: "NIELS" },
      { id: "invmdw_gc1mdw_unid", value: "1662682532994" },
      { id: "invmdwnaam", value: "" },
      { id: "invdat", value: "29-03-2025" },
      { id: "invtijd", value: "15:46:44" },
      { id: "mutmdw", value: "ROLINADMIN" },
      { id: "mutmdw_gc1mdw_unid", value: "1755044948463" },
      { id: "mutmdwnaam", value: "" },
      { id: "mutdat", value: "24-09-2025" },
      { id: "muttijd", value: "12:43:44" },
      { id: "uitvoerder", value: "NIELS" },
      { id: "uitvoerder_gc1mdw_unid", value: "1662682532994" },
      { id: "uitvoerdergrp", value: "" },
      { id: "uitvoerdergrp_sysautgrp_unid", value: "" },
      { id: "eigenaar", value: "" },
      { id: "eigenaar_gc1mdw_unid", value: "" },
      { id: "hfdverantw", value: "NIELS" },
      { id: "hfdverantw_gc1mdw_unid", value: "1662682532994" },
      { id: "initiator", value: "NIELS" },
      { id: "initiator_sysaut_unid", value: "1662682532994" },
      { id: "notificaties", value: "" },
      { id: "notificaties_gc1mdw_unid", value: "" },
      { id: "internind", value: "N" },
      { id: "priorcod", value: "4" },
      { id: "priorcod_omschr", value: "Geen voorkeur aan prioriteit" },
      { id: "intpriorcod", value: "4" },
      { id: "intpriorcod_omschr", value: "Geen voorkeur aan prioriteit" },
      { id: "relnr", value: "1" },
      { id: "relnr_gc1rel_unid", value: "1532894870863" },
      { id: "relzoeknaam", value: "PCROLIN" },
      { id: "slacod", value: "" },
      { id: "slacod_gc1slacod_unid", value: "" },
      { id: "slacodomschr", value: "" },
      { id: "slaond", value: "" },
      { id: "slaond_gc1slaond_unid", value: "" },
      { id: "slaondomschr", value: "" },
      { id: "ctpnr", value: "" },
      { id: "ctpnr_gc1ctp_unid", value: "" },
      { id: "ctpnaam", value: "" },
      { id: "afzendernaam", value: "" },
      { id: "extra_ontvangers", value: "" },
      { id: "afzender", value: "" },
      { id: "catcod", value: "" },
      { id: "catcod_wf1catcod_unid", value: "" },
      { id: "catomschr", value: "" },
      { id: "prjcod", value: "" },
      { id: "prjcod_pa1prj_unid", value: "" },
      { id: "prjdelcod", value: "" },
      { id: "prjdelcod_pa1prj_unid", value: "" },
      { id: "prjdelcount", value: "" },
      { id: "prjomschr", value: "" },
      { id: "prjdelomschr", value: "" },
      { id: "prjrelnr", value: "" },
      { id: "prjdelrelnr", value: "" },
      { id: "geschaturen", value: "1,00" },
      { id: "aantuurdb", value: "" },
      { id: "aantuurnotdb", value: "" },
      { id: "prijsafspraak", value: "" },
      { id: "ext_instnr", value: "" },
      { id: "ext_email", value: "" },
      { id: "ext_subject", value: "" },
      { id: "magcod", value: "" },
      { id: "magcod_gc1mag_unid", value: "" },
      { id: "altrefcod", value: "" },
      { id: "dbind", value: "" },
      { id: "msgknmreqind", value: "N" },
      { id: "extrefcods", value: "" },
      { id: "repfreqper", value: "" },
      { id: "repfreqper_omschr", value: "" },
      { id: "repfreqaant", value: "" },
      { id: "repaant", value: "" },
      { id: "repwerkdag", value: "N" },
      { id: "repdat", value: "" },
      { id: "uniqueid", value: "1743211873359" },
      { id: "mode", value: "2" },
      { id: "formname", value: "wf1act" },
      { id: "formversion", value: "1" },
      { id: "title", value: "Taak" },
      { id: "subtitle", value: "285862" },
      { id: "subtitlecolumn", value: "ins_nr" },
      { id: "action", value: "" },
      { id: "foreignUNIDName", value: "" },
      { id: "foreignUNIDValue", value: "" },
      { id: "warningMsg", value: "" },
      { id: "nowdate", value: "24-09-2025" },
      { id: "nowtime", value: "12:43:44" },
      { id: "from_queryid", value: "" },
      { id: "is_virtual_record", value: "false" }
    ]

    const error = await this.submitForm(
      { id: "wf1act", action: "15" },
      fields
    )

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
}