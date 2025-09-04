import { SearchColumns } from "./ticket.config";

export type CreateMessage = {
  /** Defines whether the message is an internal (I) or external (E) message */
  messageType?: "I" | "E"
  color?: "BLAUW" | "DONKER-GRIJS" | "ORANJE" | "GEEL" | "GROEN" | "PAARS" | "ROOD" | "ROZE" | "TURQUOISE"
  title?: string
  message?: string
}

export type SearchColumn = keyof typeof SearchColumns

export type Ticket = {
  /** Unique ID of the ticket
   * @example 1743211873359
   * */
  unid: number
  /** ID (ticket number)
   * @example 285862 */
  id: number
  /** Search name of the relation */
  searchName: string
  description: string
  priority: number
  internalPriority: number
  status?: string
  administrativeStatus?: string
  plannedFrom?: Date
  plannedUntil?: Date
  deadline?: Date
}