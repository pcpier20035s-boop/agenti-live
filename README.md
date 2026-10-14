# agenti-live

Pannello "Agenti al lavoro" per Claude: mostra in tempo reale quali agenti e subagenti stanno lavorando, cosa fanno, quali agenti SIVIT sono stati avviati e il registro delle azioni. Si riapre con `/agenti`.

## Installazione

Sostituisci `<account>` con l'account o l'organizzazione GitHub che ospita questo repository.

Nell'app desktop di Claude: clicca **+** accanto alla casella del messaggio → **Plugins** → **Add marketplace** e scrivi `<account>/agenti-live` → poi **Add plugin**.

Da una sessione Claude Code nel terminale:

```
/plugin install agenti-live --marketplace <account>/agenti-live
```

Da una shell:

```
claude plugin install agenti-live --marketplace <account>/agenti-live
```

Il repository è privato: lo installa solo chi è stato invitato su GitHub e ha GitHub configurato sul proprio computer (`gh auth login` poi `gh auth setup-git`).
