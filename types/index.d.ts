export type Lavoratore = {
  id: string
  nome: string
  tipo: 'principale' | 'subagente'
  attivita: string
  stato: 'lavora' | 'in attesa' | 'finito'
  azioni: number
}
export type Evento = { ora: string; chi: string; cosa: string; ok: boolean }

declare module 'claude-code' {
  interface PluginState {
    'agenti-live': {
      lavoratori: Lavoratore[]
      skill: string[]
      eventi: Evento[]
    }
  }
}
