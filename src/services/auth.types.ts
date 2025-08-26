export type LoginParams = {
  username: string
  password: string
}

export type Status = {
  date: Date
  warehouse: StatusWarehouse
  user: StatusUser
  version: number
}

export type User = {
  /** Unique ID of the user */
  unid: number
  /** ID of the user: Medewerkersnummer */
  id: number
  preferences: UserPreferences[]
  history: UserHistory
}

export type UserHistory = {
  login: Date
  created: {
    user: string
    date: Date
  }
  updated: {
    user: string
    date: Date
  }
}

export type UserPreferences = {
  /** Unique ID of this preference list */
  unid: number
  /** Search name of the user */
  user: string
  /** Workstation to which these preferences apply */
  workstation?: string
  /** Altijd tabbladen herstellen bij nieuwe sessie */
  ht?: boolean
  /** Automatisch sorteren */
  as?: boolean
  /** Werkorder veld op klokker (werkplaats) */
  w?: boolean
  /** Productieorder veld op klokker */
  p?: boolean
  /** Voorcalculatie veld op klokker */
  vc?: boolean
  /** Tabbladen sluiten bij afwerken laatste taak (workflow) */
  s?: boolean
  /** Dagen in het verleden (planning) */
  pd?: boolean
  fd?: boolean
  pw?: boolean
  fw?: boolean
  pm?: boolean
  fm?: boolean
  st?: boolean
  et?: boolean
  eh?: boolean
  es?: boolean
  eq?: boolean
  im?: boolean
  aed?: boolean
  lz?: boolean
  cr?: boolean
  qi?: boolean
}

type StatusWarehouse = {
  unid: number
  code: string
  name: string
}

type StatusUser = {
  unid: number
  id: number
  login: string
  code: string
}
