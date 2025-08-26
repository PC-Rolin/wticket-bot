import { SearchColumns } from "./ticket.config";

export type CreateMessage = {
  /** Defines whether the message is an internal (I) or external (E) message */
  messageType?: "I" | "E"
  color?: "BLAUW" | "DONKER-GRIJS" | "ORANJE" | "GEEL" | "GROEN" | "PAARS" | "ROOD" | "ROZE" | "TURQUOISE"
  title?: string
  message?: string
}

export type SearchColumn = keyof typeof SearchColumns