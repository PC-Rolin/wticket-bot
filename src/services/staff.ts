import { BaseService } from "./index";
import { parse } from "node-html-parser";

export class StaffService extends BaseService {
  async list() {
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

  async listTickets(staffId: number) {
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
}