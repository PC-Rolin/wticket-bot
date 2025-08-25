import { AuthService } from "./services/auth";
import { TicketService } from "./services/ticket";
import { StaffService } from "./services/staff";

export type Options = {
  host: string
  token?: string
}

export class WTicketBot {
  public readonly auth: AuthService
  public readonly ticket: TicketService
  public readonly staff: StaffService

  constructor(options: Options) {
    this.auth = new AuthService(options)
    this.ticket = new TicketService(options)
    this.staff = new StaffService(options)
  }
}