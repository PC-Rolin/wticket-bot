import { BaseService } from "./index";
import { LoginParams, Status, User, UserPreferences } from "./auth.types";
import { parse, type HTMLElement } from "node-html-parser";
import { Result } from "./types";

export class AuthService extends BaseService {
  async login(params: LoginParams): Result<{ token: string }> {
    const site = await this.fetch("/jsp/wf/index.jsp")
    this.setSession(site.headers)

    await this.fetch("/login?action=refreshsession", { method: "POST" })

    const body = new URLSearchParams({
      username: params.username,
      password: params.password
    })

    const response = await this.fetch("/login", { method: "POST", body })
    this.setSession(response.headers)

    if (response.ok) {
      return {
        data: {
          token: this.options.token!
        },
        error: null
      }
    } else {
      return {
        data: null,
        error: new Error(response.headers.get("message") ?? "Something went wrong")
      }
    }
  }

  async getUserUNID(): Result<{ unid: number }> {
    try {
      const html = parse(await this.request("/jsp/atsc/Status.jsp"))
      const unid = html.querySelector("#username")!.getAttribute("unid")!
      return {
        data: {
          unid: Number(unid)
        },
        error: null
      }
    } catch {
      return {
        data: null,
        error: new Error("Something went wrong")
      }
    }
  }

  async getUser(): Result<User> {
    const { data: status, error } = await this.status()
    if (error) return { data: null, error }

    try {
      const html = parse(await this.request("/jsp/gc/uiform_gc1mdw_profiel.jsp", {
        uniqueid: String(status.user.unid)
      }))

      function getLoginDate() {
        const [day, month, year] = html.querySelector("#logindat")!.getAttribute("value")!.split('-')
        const [hour, minute, second] = html.querySelector("#logintijd")!.getAttribute("value")!.split(':')
        const date = new Date()
        date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
        date.setUTCHours(Number(hour), Number(minute), Number(second), 0)
        return date
      }

      function getCreatedDate() {
        const [day, month, year] = html.querySelector("#invdat")!.getAttribute("value")!.split('-')
        const [hour, minute, second] = html.querySelector("#invtijd")!.getAttribute("value")!.split(':')
        const date = new Date()
        date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
        date.setUTCHours(Number(hour), Number(minute), Number(second), 0)
        return date
      }

      function getUpdatedDate() {
        const [day, month, year] = html.querySelector("#mutdat")!.getAttribute("value")!.split('-')
        const [hour, minute, second] = html.querySelector("#muttijd")!.getAttribute("value")!.split(':')
        const date = new Date()
        date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
        date.setUTCHours(Number(hour), Number(minute), Number(second), 0)
        return date
      }

      function getPreferences(html: HTMLElement) {
        const trs = html.querySelectorAll("tr")

        const preferences: UserPreferences[] = []
        for (const tr of trs) {
          const unid = tr.getAttribute("unid")
          if (unid && unid !== "-1") {
            const tds = tr.querySelectorAll("td")
            const boolean = (value: string) => {
              if (value === "J") return true
              if (value === "N") return false
              return undefined
            }
            preferences.push({
              unid: Number(unid),
              user: tds[0].textContent,
              workstation: tds[1].textContent === '' ? undefined : tds[1].textContent,
              ht: boolean(tds[2].textContent),
              as: boolean(tds[3].textContent),
              w: boolean(tds[4].textContent),
              p: boolean(tds[5].textContent),
              vc: boolean(tds[6].textContent),
              s: boolean(tds[7].textContent),
              pd: boolean(tds[8].textContent),
              fd: boolean(tds[9].textContent),
              pw: boolean(tds[10].textContent),
              fw: boolean(tds[11].textContent),
              pm: boolean(tds[12].textContent),
              fm: boolean(tds[13].textContent),
              st: boolean(tds[14].textContent),
              et: boolean(tds[15].textContent),
              eh: boolean(tds[16].textContent),
              es: boolean(tds[17].textContent),
              eq: boolean(tds[18].textContent),
              im: boolean(tds[19].textContent),
              aed: boolean(tds[20].textContent),
              lz: boolean(tds[21].textContent),
              cr: boolean(tds[22].textContent),
              qi: boolean(tds[23].textContent),
            })
          }
        }
        return preferences
      }

      const user: User = {
        unid: status.user.unid,
        id: status.user.id,
        preferences: getPreferences(parse(await this.request("/jsp/atsc/UITableIFrame.jsp", {
          queryid: "syscfgprf",
          foreignUNIDName: "usercod_sysaut_unid",
          foreignUNIDValue: String(status.user.unid)
        }))),
        history: {
          login: getLoginDate(),
          created: {
            user: html.querySelector("#invmdw")!.getAttribute("value")!,
            date: getCreatedDate()
          },
          updated: {
            user: html.querySelector("#mutmdw")!.getAttribute("value")!,
            date: getUpdatedDate()
          }
        }
      }
      return {
        data: user,
        error: null
      }
    } catch {
      return {
        data: null,
        error: new Error("Something went wrong")
      }
    }
  }

  async status(): Result<Status> {
    try {
      const html = parse(await this.request("/jsp/atsc/Status.jsp"))

      const [day, month, year] = html.querySelector("#nowdate")!.innerText.split('-')
      const date = new Date()
      date.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
      date.setUTCHours(0, 0, 0, 0)

      const warehouse = html.querySelector("#warehouse")!
      const username = html.querySelector("#username")!
      const version = html.querySelector("#version")!

      return {
        data: {
          date,
          warehouse: {
            unid: Number(warehouse.getAttribute("unid")!),
            code: warehouse.getAttribute("cod")!,
            name: warehouse.innerText
          },
          user: {
            unid: Number(username.getAttribute("unid")!),
            id: Number(username.getAttribute("userid")!),
            login: username.getAttribute("login")!,
            code: username.innerText,
          },
          version: Number(version.innerText)
        },
        error: null
      }
    } catch {
      return {
        data: null,
        error: new Error("Something went wrong")
      }
    }
  }

  async logout() {
    await this.fetch("/login/wf/logout.jsp")
  }
}