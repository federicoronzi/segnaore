# SegnaOre — Design Spec

## Panoramica

App per tracciare le ore lavorate giornalmente con resoconti settimanali, mensili e annuali consultabili e stampabili. Pensata per persone poco abili con la tecnologia: interfaccia minimale, pochi tap, zero complessità.

**Target iniziale:** uso personale, poi colleghi, poi distribuzione pubblica.

## Tecnologia

- **PWA (Progressive Web App)** con React + TypeScript + Vite
- **UI:** Tailwind CSS, design mobile-first responsive
- **Storage:** IndexedDB via Dexie.js (database locale nel browser)
- **Installabile** come app nativa su telefono e PC dal browser
- **Offline-first:** funziona senza connessione internet
- **Export/Import:** backup JSON per non perdere i dati

## Struttura App

### Navigazione

Barra superiore fissa con:
- Logo/nome "SegnaOre" a sinistra
- Voci menu a destra: Calendario, Report, Reperibilità, Impostazioni
- Su mobile: le voci diventano icone compatte

La schermata principale è il flusso di inserimento giornaliero.

---

## Flusso Principale — Inserimento Giornata

4 step sequenziali + riepilogo. Ogni step è una schermata a sé, si avanza con bottone "Avanti" o tasto Invio.

### Step 1: Ora di Inizio
- Data corrente mostrata in alto
- Domanda: "A che ora hai iniziato?"
- Input ore:minuti con cifre grandi (stile orologio)
- Bottone "Avanti →"

### Step 2: Ora di Fine
- Identica struttura dello step 1
- Domanda: "A che ora hai finito?"
- Bottone "Avanti →"

### Step 3: Pausa
- Domanda: "Hai fatto la pausa?"
- 3 box grandi colorati:
  - **Sì** (verde) = 1 ora di pausa (default)
  - **Mezza** (arancione) = 30 minuti
  - **No** (rosso) = 0 minuti
- Click su un box = avanza automaticamente

### Step 4: Cosa hai fatto (FACOLTATIVO)
- Domanda: "Cosa hai fatto oggi?"
- Lista servizi, ciascuno con:
  - Orario (inizio-fine)
  - Descrizione testuale
- Bottone "+ Aggiungi servizio"
- Due azioni: **Salta** (grigio) oppure **Conferma** (blu)

### Riepilogo
- Mostra ore lavorate in grande (es. "8h 00m")
- Dettaglio: inizio, fine, pausa
- Se compilati, lista servizi svolti

### Giornata già compilata
Se l'utente apre l'app e la giornata corrente è già stata inserita, mostra direttamente il riepilogo con un bottone "Modifica" per rientrare nel flusso e correggere i dati.

---

## Reperibilità

Sezione dedicata accessibile dal menu.

### Attivazione
- Toggle on/off per la settimana di reperibilità corrente
- Quando attivo, mostra la lista emergenze della settimana

### Registrazione Emergenza
- **Unico campo obbligatorio:** data
- **Campi facoltativi** (sezioni chiudibili/apribili):
  - Orario inizio/fine (stile orologio come il flusso principale)
  - Descrizione testuale libera (es. indirizzo, tipo intervento)
- Bottone "Salva emergenza"

### Lista Emergenze
- Lista cronologica delle emergenze della settimana
- Ogni emergenza mostra: numero progressivo, data, e i dettagli se compilati (orario, durata, descrizione)
- Contatore in basso: numero totale emergenze + ore totali (se gli orari sono stati inseriti)

---

## Report

Accessibile dal menu. Permette di consultare e stampare i dati.

### Selezione Periodo
4 tab in alto:
- **Settimana** — con frecce ← → per navigare tra settimane
- **Mese** — con frecce ← → per navigare tra mesi
- **Anno** — con frecce ← → per navigare tra anni
- **Custom** — date picker "Da" / "A" per periodo libero

### Contenuto Report
- Tabella giornaliera: giorno, ora inizio, ora fine, pausa, ore lavorate
- Il venerdì (o giorno con orario ridotto) evidenziato con colore diverso
- **Totale ore lavorate** nel periodo
- **Straordinario:** calcolato automaticamente (ore lavorate - ore standard da impostazioni)
- **Reperibilità:** se presente nel periodo, mostra numero emergenze
- Servizi svolti (se compilati) consultabili espandendo il giorno

### Azioni
- **Stampa** — apre la finestra di stampa del browser
- **Scarica PDF** — genera e scarica un PDF del report

---

## Calendario

Vista calendario mensile accessibile dal menu. Ogni giorno mostra:
- Ore lavorate (colore normale o evidenziato se straordinario)
- Icona emergenza se presente
- Click su un giorno apre il dettaglio di quella giornata con possibilità di modificare i dati

---

## Impostazioni

Compilate al primo avvio (wizard), modificabili successivamente dal menu.

### Campi
- **Ore giornaliere standard** — numero (es. 8)
- **Giorno con orario ridotto** — selezione giorno della settimana + numero ore per quel giorno (es. Venerdì = 6h)
- **Giorni lavorativi** — toggle per ogni giorno della settimana (default: Lun-Ven)

### Dati
- **Esporta backup** — scarica file JSON con tutti i dati
- **Importa backup** — carica file JSON per ripristinare i dati

---

## Modello Dati (IndexedDB)

### settings
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | string | "main" (record singolo) |
| standardHours | number | Ore giornaliere standard |
| reducedDay | number | Giorno settimana con orario ridotto (0=Dom, 5=Ven) |
| reducedHours | number | Ore nel giorno ridotto |
| workDays | number[] | Giorni lavorativi (0-6) |
| setupComplete | boolean | Se il wizard iniziale è stato completato |

### workEntries
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | string | Auto-generato |
| date | string | Data ISO (YYYY-MM-DD), indice univoco |
| startTime | string | Ora inizio (HH:mm) |
| endTime | string | Ora fine (HH:mm) |
| breakMinutes | number | Minuti di pausa (0, 30, 60) |
| workedMinutes | number | Minuti lavorati (calcolato) |
| services | Service[] | Lista servizi (facoltativo) |

### Service (oggetto innestato in workEntries)
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| startTime | string | Ora inizio servizio (HH:mm) |
| endTime | string | Ora fine servizio (HH:mm) |
| description | string | Descrizione libera |

### onCallWeeks
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | string | Auto-generato |
| weekStart | string | Data ISO del lunedì della settimana |
| active | boolean | Se la reperibilità è attiva |

### emergencies
| Campo | Tipo | Descrizione |
|-------|------|-------------|
| id | string | Auto-generato |
| weekId | string | Riferimento a onCallWeeks.id |
| date | string | Data ISO (obbligatorio) |
| startTime | string? | Ora inizio (facoltativo) |
| endTime | string? | Ora fine (facoltativo) |
| durationMinutes | number? | Durata in minuti (calcolato se orari presenti) |
| description | string? | Descrizione libera (facoltativo) |

---

## Calcoli Automatici

- **Ore lavorate** = (endTime - startTime) - breakMinutes
- **Ore standard giornata** = standardHours, oppure reducedHours se è il giorno ridotto
- **Straordinario giornaliero** = ore lavorate - ore standard (se positivo)
- **Totali periodo** = somma ore lavorate di tutti i giorni nel periodo
- **Straordinario periodo** = somma straordinari giornalieri

---

## Primo Avvio

Al primo avvio (setupComplete = false), l'app mostra un wizard di 3 step:
1. "Quante ore lavori al giorno?" → input numero
2. "C'è un giorno con meno ore?" → selezione giorno + ore ridotte (con opzione "No, tutti uguali")
3. "Quali giorni lavori?" → toggle giorni settimana

Dopo il wizard, si arriva al flusso principale.

---

## Stack Tecnico Dettagliato

| Componente | Tecnologia |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Database locale | Dexie.js (wrapper IndexedDB) |
| PWA | vite-plugin-pwa (service worker + manifest) |
| PDF | html2pdf.js o react-pdf |
| Routing | React Router (hash-based per PWA) |
| Stato | React Context + useReducer (no librerie esterne) |
| Date | date-fns |
