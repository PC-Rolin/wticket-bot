import type { Options } from "../client";
import { Field, Form } from "../types";
import { toXML } from "jstoxml";
import { XMLParser } from "fast-xml-parser";

export abstract class BaseService {
  protected options: Options

  public constructor(options: Options) {
    this.options = options
  }

  protected setSession(headers: Headers) {
    this.options.token = headers.getSetCookie()[0].split(';')[0].split('=')[1]
  }

  protected async fetch(path: string, options?: {
    method?: "GET" | "POST"
    headers?: HeadersInit
    body?: BodyInit
  }) {
    return fetch("https://" + this.options.host + path, {
      method: options?.method ?? "GET",
      headers: {
        ...options?.headers,
        Cookie: `JSESSIONID=${this.options.token}`
      },
      body: options?.body
    })
  }

  protected async request(path: string, options?: Record<string, string>) {
    const url = new URL(`https://${this.options.host}${path}`)
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        url.searchParams.set(key, value)
      }
    }

    const response = await fetch(url, {
      headers: {
        Cookie: `JSESSIONID=${this.options.token}`
      }
    })

    return await response.text()
  }

  protected async submitForm(form: Form, fields: Field[]) {
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

  protected async executeAction(params: Record<string, string>) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, value)
    }

    return this.fetch("/IOServlet" + searchParams.toString(), { method: "POST" })
  }
}