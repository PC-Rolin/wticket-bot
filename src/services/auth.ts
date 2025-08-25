import { BaseService } from "./index";
import { LoginParams } from "./auth.types";

export class AuthService extends BaseService {
  async login(params: LoginParams) {
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
}