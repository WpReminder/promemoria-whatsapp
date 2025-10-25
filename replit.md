# WhatsApp Reminder - Gestione Appuntamenti

Webapp professionale per la gestione di appuntamenti con invio automatico di reminder via WhatsApp.

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Caratteristiche](#caratteristiche)
3. [Tecnologie Utilizzate](#tecnologie-utilizzate)
4. [Configurazione Iniziale](#configurazione-iniziale)
5. [Configurazione API WhatsApp](#configurazione-api-whatsapp)
6. [Personalizzazione Timing Reminder](#personalizzazione-timing-reminder)
7. [Deploy su Vercel](#deploy-su-vercel)
8. [Deploy su Replit](#deploy-su-replit)
9. [Struttura del Progetto](#struttura-del-progetto)
10. [API Endpoints](#api-endpoints)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Panoramica

Questa applicazione consente a professionisti (medici, consulenti, ecc.) di:
- Creare e gestire appuntamenti con pazienti/clienti
- Salvare informazioni (nome, numero WhatsApp, data/ora)
- Inviare automaticamente reminder via WhatsApp un'ora prima dell'appuntamento
- Tracciare quali reminder sono stati inviati

## ✨ Caratteristiche

- **Form Intuitivo**: Inserimento rapido di nome, numero WhatsApp (+39) e data/ora
- **Validazione Automatica**: Controllo formato numero italiano e date future
- **Lista Appuntamenti**: Visualizzazione ordinata dei prossimi appuntamenti
- **Reminder Automatici**: Sistema scheduler che invia messaggi WhatsApp
- **Design Responsivo**: Ottimizzato per mobile e desktop
- **Database PostgreSQL**: Persistenza dati affidabile

## 🛠 Tecnologie Utilizzate

### Frontend
- **HTML5, CSS3**: Struttura e stile
- **React + TypeScript**: UI components
- **TailwindCSS**: Design system
- **React Query**: Data fetching e cache
- **React Hook Form + Zod**: Form validation

### Backend
- **Node.js + Express**: Server API REST
- **PostgreSQL (Neon)**: Database
- **Drizzle ORM**: Type-safe database queries
- **node-cron**: Scheduling automatico
- **Axios**: HTTP client per WhatsApp API

### Deployment
- **Vercel**: Hosting principale con serverless functions
- **Replit**: Sviluppo e hosting alternativo

---

## ⚙️ Configurazione Iniziale

### 1. Installazione Dipendenze

```bash
npm install
```

### 2. Configurazione Database

Il database PostgreSQL è già configurato. Per creare le tabelle:

```bash
npm run db:push
```

Questo comando crea la tabella `appointments` con:
- `id` - Identificativo univoco
- `name` - Nome paziente/cliente
- `phone` - Numero WhatsApp (formato +39XXXXXXXXX)
- `datetime` - Data e ora appuntamento
- `reminder_sent` - Flag per tracciare reminder inviati
- `created_at` - Timestamp creazione

### 3. Variabili d'Ambiente

Crea un file `.env` basato su `.env.example`:

```bash
# Database (già configurato su Replit)
DATABASE_URL=postgresql://...

# WhatsApp Cloud API (da configurare)
WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID_HERE

# Session secret
SESSION_SECRET=your-random-secret-key
```

---

## 📱 Configurazione API WhatsApp

### Passo 1: Creare App Business su Meta

1. Vai su [Meta for Developers](https://developers.facebook.com/)
2. Clicca su **"My Apps"** → **"Create App"**
3. Seleziona **"Business"** come tipo di app
4. Compila i dettagli richiesti e crea l'app

### Passo 2: Configurare WhatsApp

1. Nel pannello dell'app, aggiungi il prodotto **WhatsApp**
2. Vai su **WhatsApp > Getting Started**
3. Troverai:
   - **Phone Number ID**: Copia questo valore
   - **Access Token**: Clicca su "Generate Token" e copia il token

### Passo 3: Testare l'API

WhatsApp fornisce numeri di test per verificare l'integrazione:

1. Nella sezione "Send and receive messages"
2. Aggiungi il tuo numero di telefono ai numeri di test
3. Riceverai un codice di verifica via WhatsApp
4. Una volta verificato, puoi ricevere messaggi di test

### Passo 4: Configurare le Credenziali

#### Su Replit:

1. Apri il pannello **Secrets** (icona lucchetto nella sidebar)
2. Aggiungi due secrets:
   - Key: `WHATSAPP_ACCESS_TOKEN`, Value: il tuo access token
   - Key: `WHATSAPP_PHONE_NUMBER_ID`, Value: il tuo phone number ID

#### Su Vercel:

1. Vai su **Settings > Environment Variables**
2. Aggiungi le stesse variabili:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`

### Passo 5: Verificare Configurazione

I file `server/whatsapp.ts` e `api/reminder.js` contengono placeholder:

```javascript
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "YOUR_ACCESS_TOKEN_HERE";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "YOUR_PHONE_NUMBER_ID_HERE";
```

Quando le variabili d'ambiente sono configurate correttamente, questi placeholder vengono automaticamente sostituiti.

### Note Importanti

- **Modalità Test**: Puoi inviare messaggi solo ai numeri aggiunti come "test numbers"
- **Produzione**: Per inviare a qualsiasi numero, devi completare la Business Verification
- **Rate Limits**: Nell'account gratuito ci sono limiti di messaggi giornalieri
- **Costi**: Controlla i [prezzi WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/pricing)
- **Timezone**: L'app gestisce automaticamente i fusi orari. Il frontend converte l'orario locale dell'utente in UTC prima dell'invio, garantendo reminder precisi indipendentemente dalla località del server o dell'utente. Gli appuntamenti vengono sempre mostrati nel fuso orario locale del browser.

---

## ⏰ Personalizzazione Timing Reminder

### Modificare Tempo Prima dell'Appuntamento

Il tempo predefinito è **1 ora prima** dell'appuntamento. Per modificarlo:

#### File: `server/scheduler.ts`

```typescript
/**
 * CONFIGURAZIONE TEMPO REMINDER
 * 
 * Modifica questa costante per cambiare quanto tempo prima dell'appuntamento
 * deve essere inviato il reminder:
 * - 1 = un'ora prima (default)
 * - 2 = due ore prima
 * - 0.5 = 30 minuti prima
 * - 24 = un giorno prima
 */
export const REMINDER_HOURS_BEFORE = 1; // <-- MODIFICA QUESTO VALORE
```

#### File: `api/reminder.js` (per Vercel)

```javascript
/**
 * CONFIGURAZIONE TEMPO REMINDER
 */
const REMINDER_HOURS_BEFORE = 1; // <-- MODIFICA QUESTO VALORE
```

### Modificare Frequenza Controllo Scheduler

Per default, lo scheduler controlla ogni ora. Per modificare:

#### File: `server/scheduler.ts`

```typescript
export function startReminderScheduler() {
  // ESEMPI DI SCHEDULE CRON:
  // "0 * * * *"     = ogni ora al minuto 0
  // "*/30 * * * *"  = ogni 30 minuti
  // "0 */2 * * *"   = ogni 2 ore
  // "0 9-18 * * *"  = ogni ora dalle 9 alle 18
  
  const cronSchedule = "0 * * * *"; // <-- MODIFICA QUESTO
  
  cron.schedule(cronSchedule, async () => {
    await processPendingReminders();
  });
}
```

#### File: `vercel.json` (per Vercel Cron)

```json
{
  "crons": [{
    "path": "/api/reminder",
    "schedule": "0 * * * *"  // <-- MODIFICA QUESTO
  }]
}
```

Formati schedule comuni:
- `0 * * * *` - Ogni ora
- `*/15 * * * *` - Ogni 15 minuti
- `0 */6 * * *` - Ogni 6 ore
- `0 8 * * *` - Ogni giorno alle 8:00

---

## 🚀 Deploy su Vercel

### Prerequisiti

- Account Vercel (gratuito)
- Database PostgreSQL Neon (o Vercel Postgres)
- Credenziali WhatsApp Cloud API

### Step 1: Preparazione Database

Se usi Vercel Postgres:

```bash
# Installa Vercel CLI
npm i -g vercel

# Collega il progetto
vercel link

# Crea database Postgres
vercel postgres create
```

Prendi nota della `DATABASE_URL` generata.

### Step 2: Configurare Environment Variables

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings > Environment Variables**
4. Aggiungi:
   - `DATABASE_URL` - La tua connection string PostgreSQL
   - `WHATSAPP_ACCESS_TOKEN` - Il tuo WhatsApp access token
   - `WHATSAPP_PHONE_NUMBER_ID` - Il tuo WhatsApp phone number ID

### Step 3: Deploy

#### Opzione A: Deploy tramite Git

1. Pusha il codice su GitHub
2. Vai su [Vercel](https://vercel.com)
3. Clicca **"Import Project"**
4. Seleziona il repository
5. Vercel rileverà automaticamente la configurazione
6. Clicca **"Deploy"**

#### Opzione B: Deploy tramite CLI

```bash
# Deploy
vercel --prod

# Il database viene migrato automaticamente
```

### Step 4: Configurare Cron Job

Il file `vercel.json` è già configurato:

```json
{
  "crons": [{
    "path": "/api/reminder",
    "schedule": "0 * * * *"
  }]
}
```

Vercel eseguirà automaticamente `/api/reminder` ogni ora.

### Step 5: Inizializzare Database

Dopo il primo deploy:

```bash
# Migra il database
npm run db:push
```

O usa la Vercel CLI:

```bash
vercel env pull .env.local
npm run db:push
```

### Step 6: Verificare Deploy

1. Visita `https://your-project.vercel.app`
2. Prova a creare un appuntamento
3. Verifica che i dati vengano salvati
4. Controlla i log su Vercel Dashboard

### Monitoring

- **Logs**: Vercel Dashboard > Deployments > Logs
- **Analytics**: Vercel Dashboard > Analytics
- **Cron Logs**: Vercel Dashboard > Cron Jobs

---

## 🔧 Deploy su Replit

### Sviluppo su Replit

L'app è già configurata per funzionare su Replit:

1. **Database**: PostgreSQL già provisioned
2. **Environment Variables**: Usa il pannello Secrets
3. **Workflow**: `npm run dev` già configurato

### Configurazione

1. **Secrets** (pannello lucchetto):
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`

2. **Avvia App**:
   ```bash
   npm run dev
   ```

3. **Accedi**:
   - L'app sarà disponibile nella preview Replit
   - O visita il dominio assegnato

### Deploy Permanente su Replit

#### Opzione 1: Always On (Piano Hacker)

1. Vai su **Settings**
2. Abilita **Always On**
3. L'app rimarrà attiva 24/7

#### Opzione 2: Replit Deployments

1. Clicca sul pulsante **"Deploy"**
2. Seleziona **"Reserved VM"** o **"Autoscale"**
3. Configura le variabili d'ambiente
4. Clicca **"Deploy"**

Replit Deployments offre:
- URL permanente (`.replit.dev`)
- Auto-scaling
- Zero downtime deployments
- Monitoring integrato

### Differenze Replit vs Vercel

| Caratteristica | Replit | Vercel |
|---------------|---------|--------|
| **Hosting** | VM persistente | Serverless |
| **Cron Jobs** | node-cron interno | Vercel Cron |
| **Database** | Neon PostgreSQL | Vercel/Neon Postgres |
| **Scheduler** | Sempre attivo con Always On | Trigger esterni |
| **Pricing** | Free tier generoso | Free tier con limiti |

### Note su Cron/Scheduler

Su Replit:
- Lo scheduler node-cron parte automaticamente con l'app
- Funziona solo se l'app è Always On o Deployed
- Non richiede configurazione esterna

Su Vercel:
- Usa Vercel Cron Jobs (configurato in `vercel.json`)
- Trigger esterni ogni ora
- Serverless function attivata on-demand

---

## 📁 Struttura del Progetto

```
.
├── api/                          # Vercel Serverless Functions
│   ├── appointments.js           # API appuntamenti (GET/POST)
│   ├── reminder.js               # Cron job reminder
│   └── package.json              # Dependencies per Vercel
│
├── client/                       # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── appointment-form.tsx    # Form creazione appuntamento
│   │   │   ├── appointment-list.tsx    # Lista appuntamenti
│   │   │   └── ui/                     # Componenti UI base
│   │   ├── pages/
│   │   │   ├── home.tsx               # Homepage principale
│   │   │   └── not-found.tsx          # 404 page
│   │   ├── lib/
│   │   │   └── queryClient.ts         # React Query setup
│   │   ├── App.tsx                    # Root component
│   │   ├── index.css                  # Styles globali
│   │   └── main.tsx                   # Entry point
│   └── index.html                     # HTML template
│
├── server/                       # Backend Express
│   ├── db.ts                     # Database connection
│   ├── storage.ts                # Data access layer
│   ├── routes.ts                 # API routes
│   ├── scheduler.ts              # Cron job scheduler
│   ├── whatsapp.ts               # WhatsApp API integration
│   └── index.ts                  # Server entry point
│
├── shared/                       # Codice condiviso
│   └── schema.ts                 # Database schema + validation
│
├── .env.example                  # Template variabili d'ambiente
├── vercel.json                   # Configurazione Vercel + Cron
├── drizzle.config.ts             # Drizzle ORM config
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind config
└── replit.md                     # Questa guida
```

---

## 🔌 API Endpoints

### GET `/api/appointments`

Recupera tutti gli appuntamenti ordinati per data.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Mario Rossi",
    "phone": "+393401234567",
    "datetime": "2024-10-25T14:30:00Z",
    "reminderSent": false,
    "createdAt": "2024-10-24T10:00:00Z"
  }
]
```

### POST `/api/appointments`

Crea nuovo appuntamento.

**Request Body:**
```json
{
  "name": "Mario Rossi",
  "phone": "+393401234567",
  "datetime": "2024-10-25T14:30:00Z"
}
```

**Validazione:**
- `name`: minimo 2 caratteri
- `phone`: formato `+39XXXXXXXXX` (9-10 cifre dopo +39)
- `datetime`: deve essere una data futura

**Response:** (201 Created)
```json
{
  "id": 1,
  "name": "Mario Rossi",
  "phone": "+393401234567",
  "datetime": "2024-10-25T14:30:00Z",
  "reminderSent": false,
  "createdAt": "2024-10-24T10:00:00Z"
}
```

### POST `/api/reminder`

Trigger manuale per processare reminder (usato anche da cron).

**Response:**
```json
{
  "success": true,
  "message": "Processed 2 reminders",
  "sent": 2,
  "failed": 0
}
```

### GET `/api/reminder`

Verifica stato scheduler.

**Response:**
```json
{
  "status": "Reminder scheduler is running",
  "message": "Use POST /api/reminder to manually trigger"
}
```

---

## 🐛 Troubleshooting

### Problema: Reminder non vengono inviati

**Sintomi**: Gli appuntamenti vengono creati ma `reminderSent` rimane `false`

**Soluzioni**:

1. **Verifica credenziali WhatsApp**:
   ```bash
   # Controlla se le variabili sono settate
   echo $WHATSAPP_ACCESS_TOKEN
   echo $WHATSAPP_PHONE_NUMBER_ID
   ```

2. **Controlla i log**:
   - Su Replit: Pannello Console
   - Su Vercel: Dashboard > Logs

3. **Testa manualmente**:
   ```bash
   curl -X POST https://your-app.vercel.app/api/reminder
   ```

4. **Verifica numeri di test**:
   - I numeri devono essere aggiunti come "test numbers" nella Meta Console
   - O completare Business Verification per numeri reali

### Problema: Database connection error

**Sintomi**: Errore `DATABASE_URL must be set`

**Soluzioni**:

1. **Verifica DATABASE_URL**:
   ```bash
   # Su Replit, controlla Secrets
   # Su Vercel, controlla Environment Variables
   ```

2. **Ricrea database**:
   ```bash
   npm run db:push --force
   ```

### Problema: Form validation error

**Sintomi**: Form non si sottomette anche se compilato

**Soluzioni**:

1. **Verifica formato numero**:
   - Deve iniziare con `+39`
   - Seguito da 9-10 cifre
   - Esempio corretto: `+393401234567`

2. **Verifica data**:
   - Deve essere futura
   - Usa il datetime picker del browser

### Problema: Cron non esegue su Vercel

**Sintomi**: `/api/reminder` non viene chiamato automaticamente

**Soluzioni**:

1. **Verifica vercel.json**:
   ```json
   {
     "crons": [{
       "path": "/api/reminder",
       "schedule": "0 * * * *"
     }]
   }
   ```

2. **Controlla piano Vercel**:
   - Cron Jobs disponibili solo su piani Pro+
   - Considera Replit Always On come alternativa

3. **Usa external cron service**:
   - [cron-job.org](https://cron-job.org)
   - [EasyCron](https://www.easycron.com/)
   - Configura per chiamare POST `/api/reminder` ogni ora

---

## 📚 Risorse Aggiuntive

### Documentazione API

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Platform](https://business.whatsapp.com/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

### Guide Meta for Developers

- [Getting Started with WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Send Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)

### Database

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Neon Postgres](https://neon.tech/docs/introduction)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

### Support

- Per problemi specifici: Apri issue su GitHub
- Per WhatsApp API: [Meta Developer Community](https://developers.facebook.com/community/)
- Per Vercel: [Vercel Support](https://vercel.com/support)

---

## 🎉 Conclusione

Hai ora una webapp completa per la gestione di appuntamenti con reminder WhatsApp automatici!

**Next Steps**:

1. ✅ Configura le credenziali WhatsApp
2. ✅ Deploy su Vercel o Replit
3. ✅ Testa con numeri di prova
4. ✅ Personalizza timing reminder se necessario
5. ✅ Completa Business Verification per uso produzione

**Buon lavoro! 🚀**
