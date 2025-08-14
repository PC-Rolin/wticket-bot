export type RawTicket = {
  p: string
  pi: string
  s: string
  '"AS"': string
  timestamp_start: string
  '"Gepland van"': string
  planbegintijd: string
  timestamp_end: string
  '"Geplant t/m"': string
  planeindtijd: string
  notifydat: string
  eig: string
  uitvoerders: string
  groepen: string
  internind: string
  relnr: string
  naam: string
  '"Gewicht"': string
  instnr: string
  intpriorcod: string
  priorgew: string
  procesdef_name: string
  finished: string
  werkbegindat: string
  werkeinddat: string
  fatalets: string
  actnr: string
  werkbegints: string
  werkeindts: string
  norm: string
  boek: string
  verschil: string
  catcod: string
  catomschr: string
  slacod: string
  slacodomschr: string
  slaond: string
  slaondomschr: string
  projectcode: string
  rayon: string
  vrkordnr: string
  proces_werkbegindat: string
  proces_werkbegintijd: string
  proces_werkbegindattijd: string
  altrefcod: string
  resolve_msgsrt: string
  foreign_table: string
  foreign_unid: string
  stap: string
  ins_omschr: string
  notificaties_gc1mdw_unid: string
  betrokken_gc1mdw_unid: string
  uitvoerdergrp_gc1mdw_unids: string
  bijlage_sysfls_unids: string
  hfdverantw_gc1mdw_unid: string
  relnr_gc1rel_unid: string
  ctpnr_gc1ctp_unid: string
  uitvoerder_gc1mdw_unid: string
  uitvoerdergrp_sysautgrp_unid: string
  logo_sysfls_unid: string
  initiator_sysaut_unid: string
  uptodate_readers_unids: string
  wf1act_unid: string
  wf1_procesins_unid: string
}

export type Ticket = {
  id: number
  number: number
  description: string
}