import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Evento, Lavoratore } from '../types'

const PANE = 'agenti-live'
const TITOLO = 'Agenti al lavoro'
const lavoratori = atom({ plugin: 'agenti-live', key: 'lavoratori' } as const, [])
const skill = atom({ plugin: 'agenti-live', key: 'skill' } as const, [])
const eventi = atom({ plugin: 'agenti-live', key: 'eventi' } as const, [])

const PRINCIPALE = 'main'

/** Nome leggibile delle azioni più comuni. */
const AZIONI: Record<string, string> = {
  Read: 'legge un file',
  Write: 'scrive un file',
  Edit: 'modifica un file',
  Bash: 'esegue un comando',
  Grep: 'cerca nei file',
  Glob: 'elenca file',
  WebSearch: 'cerca sul web',
  WebFetch: 'apre una pagina web',
  Skill: 'avvia un agente SIVIT',
  Agent: 'avvia un subagente',
  AskUserQuestion: 'ti fa una domanda',
  Artifact: 'pubblica una pagina',
  SendUserFile: 'ti invia un file',
  TaskCreate: 'aggiorna la lista attività',
  TaskUpdate: 'aggiorna la lista attività',
}

function descrivi(tool: string): string {
  if (AZIONI[tool]) return AZIONI[tool]
  if (tool.startsWith('mcp__remote-devices__device_stage')) return 'copia file dal tuo PC'
  if (tool.startsWith('mcp__remote-devices__device_commit')) return 'salva file sul tuo PC'
  if (tool.startsWith('mcp__remote-devices__')) return 'lavora sul tuo PC'
  if (tool.startsWith('mcp__')) return 'usa un connettore'
  return tool
}

function ora(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function campo(e: unknown, k: string): string | undefined {
  const v = (e as Record<string, unknown>)[k]
  return typeof v === 'string' ? v : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agenti', description: 'Apre il pannello degli agenti al lavoro' })
    void $.ui.open({ id: PANE, title: TITOLO })
    return next(e)
  })

  on('command.run', { command: 'agenti' }, async $ => {
    await $.ui.open({ id: PANE, title: TITOLO })
    return { text: 'Pannello “Agenti al lavoro” aperto.' }
  })

  on('tool.call', async ($, e, next) => {
    const chi = e.agentId ?? PRINCIPALE
    const cosa = descrivi(e.tool)
    let dettaglio = ''
    try {

    if (e.tool === 'Skill') {
      const nome = (campo(e, 'skill') ?? '').replace('anthropic-skills:', '')
      dettaglio = nome
      if (nome) await update($, skill, l => (l.includes(nome) ? l : [...l, nome]))
    }
    if (e.tool === 'Agent') dettaglio = campo(e, 'description') ?? ''

    await update($, lavoratori, l => {
      const c = l.find(x => x.id === chi)
      const base: Lavoratore = c ?? {
        id: chi,
        nome: chi === PRINCIPALE ? 'Claude (principale)' : `Subagente ${chi.slice(0, 6)}`,
        tipo: chi === PRINCIPALE ? 'principale' : 'subagente',
        attivita: '',
        stato: 'lavora',
        azioni: 0,
      }
      const agg: Lavoratore = {
        ...base,
        attivita: dettaglio ? `${cosa}: ${dettaglio}` : cosa,
        stato: e.tool === 'AskUserQuestion' ? 'in attesa' : 'lavora',
        azioni: base.azioni + 1,
      }
      return c ? l.map(x => (x.id === chi ? agg : x)) : [...l, agg]
    })
    } catch {
      // il pannello non deve mai bloccare il lavoro degli agenti
    }

    const r = await next(e)
    try {

    const ok = !(r as { isError?: boolean }).isError
    const ev: Evento = { ora: ora(), chi: chi === PRINCIPALE ? 'Claude' : chi.slice(0, 6), cosa: dettaglio ? `${cosa}: ${dettaglio}` : cosa, ok }
    await update($, eventi, l => [...l, ev].slice(-60))
    await update($, lavoratori, l => l.map(x => (x.id === chi && x.stato === 'in attesa' ? { ...x, stato: 'lavora' } : x)))
    } catch {
      // idem
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const chi = e.agentId ?? PRINCIPALE
    await update($, lavoratori, l => l.map(x => (x.id === chi ? { ...x, stato: 'finito', attivita: 'turno concluso' } : x)))
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const lav = await read($, lavoratori)
    const sk = await read($, skill)
    const ev = await read($, eventi)
    const righe = Math.max(4, (e.viewport?.rows ?? 30) - 10 - lav.length - (sk.length ? 2 : 0))
    const colore = (s: Lavoratore['stato']) => (s === 'lavora' ? 'warning' : s === 'in attesa' ? 'permission' : 'success')

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text weight="bold">AGENTI</Text>
          {lav.length === 0 && <Text dimColor>Nessun agente ancora attivo.</Text>}
          {lav.map(x => (
            <Text>
              <Text color={colore(x.stato)}>● {x.stato.toUpperCase()}</Text> <Text weight="semibold">{x.nome}</Text>
              <Text dimColor> · {x.attivita} · {x.azioni} azioni</Text>
            </Text>
          ))}
        </Box>
        {sk.length > 0 && (
          <Box flexDirection="column">
            <Text weight="bold">AGENTI SIVIT USATI</Text>
            <Text color="claude">{sk.join('  ·  ')}</Text>
          </Box>
        )}
        <Box flexDirection="column">
          <Text weight="bold">REGISTRO</Text>
          {ev.length === 0 && <Text dimColor>Le azioni compariranno qui mentre gli agenti lavorano.</Text>}
          {ev.slice(-righe).map(x => (
            <Text dimColor={x.ok}>
              {x.ora} <Text color={x.ok ? 'success' : 'error'}>{x.ok ? '✓' : '✗'}</Text> {x.chi} {x.cosa}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })
}
