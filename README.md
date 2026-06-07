# BrewRef
– Max Zeitler (8403711), Elena Solodova (9388442), Zoe Bedé (1878920)

> **Projekttyp:** Mobile App (Cross-Plattform)  
> **Technologie:** Expo / React Native / TypeScript  
> **Plattformen:** iOS · Android · Web  

Cross-Plattform-**Cloud-Plattform** zur systematischen Erfassung, Verwaltung und KI-gestützten Analyse von Espresso-Brühvorgängen. Mehrere Nutzer teilen sich ein Supabase-Backend; der KI-Berater (Brew Doctor) reichert seine Empfehlungen mit **anonymisierten Brüh-Daten anderer Nutzer derselben Bohne** an. Architektur, Anforderungen, Entwurfsentscheidungen, UML-Diagramme, UI-Prinzipien und Testdokumentation sind der begleitenden Seminararbeit zu entnehmen.

---

## Inhaltsverzeichnis

1. [Demo-Video](#1-demo-video)
2. [Technologie-Stack](#2-technologie-stack)
3. [Projektstruktur](#3-projektstruktur)
4. [Testausführung](#4-testausführung)
5. [Installation und Ausführung](#5-installation-und-ausführung)
6. [Erklärung zur Verwendung generativer KI](#6-erklärung-zur-verwendung-generativer-ki)

---

## 1. Demo-Video

Ein kurzes Video demonstriert die App im praktischen Einsatz — vom Brew Logging über die Stammdatenverwaltung bis zur KI-Beratung.

📎 [Anwendungsbeispiel.mov](Anwendungsbeispiel.mov)

---

## 2. Technologie-Stack

| Komponente | Technologie |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, TypeScript (strict) |
| Navigation | Expo Router v6 mit Custom Tab Bar + zentralem FAB |
| Design System | Shopify Restyle (Crema-Theme: warm-braun, Amber-Akzente) |
| Backend | Supabase — Postgres mit Row Level Security |
| Authentifizierung | Supabase Auth (E-Mail + Passwort) via `@supabase/supabase-js` |
| Datenpersistenz | Supabase Postgres (Cloud); Session-Persistenz via AsyncStorage / localStorage |
| KI-Integration | Supabase Edge Function (Deno) → Google Gemini (`gemini-flash-latest`) mit Structured Outputs; API-Key bleibt serverseitig |
| Community-Daten | `SECURITY DEFINER`-SQL-Funktion liefert anonymisierte, k-anonymisierte Aggregate über Bohnen-Brews aller opt-in Nutzer |
| Typografie | Inter, JetBrains Mono via `expo-font` |
| Grafiken | `react-native-svg` |
| Animationen | `react-native-reanimated`, `Animated` API (entkoppelte Backdrop/Sheet-Animation) |
| Haptik | `expo-haptics` |
| Gestensteuerung | `react-native-gesture-handler` |

---

## 3. Projektstruktur

```
Coffee-app/
├── app/                          # Navigation Layer (Expo Router)
│   ├── _layout.tsx               # Root-Layout: Font-Loading, AuthProvider
│   ├── auth.tsx                  # Login / Registrierung (E-Mail + Passwort)
│   ├── settings.tsx              # Einstellungen: Profil, Community-Toggle, Sign Out
│   └── (tabs)/
│       ├── _layout.tsx           # Tab-Navigator mit CremaTabBar
│       ├── index.tsx             # Overview / Dashboard
│       ├── history.tsx           # Brühverlauf (Brews)
│       ├── coffees.tsx           # Shelf (Bohnen + Mühlen kombiniert)
│       ├── log.tsx               # Brew Logger (zentraler FAB)
│       └── doctor.tsx            # KI-Berater (Brew Doctor)
│
├── supabase/                     # Backend (Postgres + Edge Functions)
│   ├── migrations/
│   │   ├── 0001_init.sql         # Tabellen, RLS-Policies, New-User-Trigger
│   │   └── 0002_community.sql    # get_community_bean_stats (anonymisiert, k-anonym)
│   └── functions/
│       └── brew-advice/index.ts  # Edge Function: Prompt + Gemini-Call + Community-Kontext
│
└── src/
    ├── presentation/             # UI-Schicht
    │   ├── theme/index.ts        # Shopify Restyle Theme (Crema)
    │   ├── components/           # BottomSheet, CremaTabBar, StarRating,
    │   │                         # ScreenHeader, Segmented, Chip, Card, …
    │   └── screens/              # ShelfScreen, ManageCoffeesScreen, ManageGrindersScreen
    │
    ├── domain/                   # Domänen- / Geschäftslogik-Schicht
    │   ├── entities/             # User, Coffee, Grinder, BrewLog
    │   ├── services/             # AuthService (Supabase Auth), AIService (Edge-Function-Client)
    │   ├── context/              # AuthContext (React-Context)
    │   └── builders/             # BrewBuilder (Builder-Pattern)
    │
    ├── data/                     # Datenzugriffs-Schicht
    │   ├── supabase.ts           # Supabase-Client (Singleton)
    │   └── repositories/         # CoffeeRepository, GrinderRepository, BrewRepository
    │
    └── utils/                    # brewMetrics, freshness, mockData
```

---

## 4. Testausführung

| Framework | Testtypen | Dateien |
|---|---|---|
| Jest + ts-jest | Unit, Integration, System | `__tests__/test_unit.ts`, `test_integration.ts`, `test_system.ts` |
| Playwright | E2E | `e2e/test_e2e.spec.ts` |

Die Integrations- und Systemtests ersetzen den Supabase-Client durch ein In-Memory-Mock (`__tests__/helpers/MockSupabase.ts`) — deterministisch, ohne Netzwerk oder echte Datenbank.

```bash
# Alle Jest-Tests (Unit + Integration + System)
npm test

# Einzelne Testtypen
npm run test:unit
npm run test:integration
npm run test:system

# E2E-Test (erfordert laufenden Dev-Server in separatem Terminal)
npx expo start --web        # Terminal 1
npm run test:e2e             # Terminal 2
```

---

## 5. Installation und Ausführung

### 5.1 Voraussetzungen

- Node.js ≥ 18
- npm oder yarn
- Expo CLI (optional — `npx expo` funktioniert ebenfalls)
- Ein (kostenloses) Supabase-Projekt + Supabase CLI
- Ein Google Gemini API-Key (für den Brew Doctor)

### 5.2 Installation

```bash
cd Coffee-app
npm install
```

### 5.3 Backend & Konfiguration

Die App benötigt ein Supabase-Backend (Datenbank, Auth, KI-Edge-Function). Die
vollständige, kopierbare Schritt-für-Schritt-Anleitung steht in **[`DEPLOY.md`](DEPLOY.md)**.
Kurzfassung:

```bash
# 1. Supabase-Projekt anlegen (supabase.com) und verknüpfen
supabase login
supabase link --project-ref <project-ref>

# 2. Schema + RLS + Community-Funktion einspielen
supabase db push

# 3. KI-Edge-Function deployen (Gemini-Key bleibt serverseitig!)
supabase secrets set GEMINI_API_KEY=<your-gemini-key>
supabase functions deploy brew-advice

# 4. Client-.env anlegen
cp .env.example .env   # dann EXPO_PUBLIC_SUPABASE_URL + _ANON_KEY eintragen
```

> **Sicherheit:** Der Gemini-Key ist **kein** Client-Variable mehr — er lebt
> ausschließlich als Edge-Function-Secret und wird nie ins Bundle ausgeliefert.
> Der Supabase-Anon-Key darf öffentlich sein; Row Level Security schützt die Daten.

### 5.4 Starten der Anwendung

```bash
# Web-Version
npx expo start --web

# iOS (Simulator oder physisches Gerät)
npx expo start --ios

# Android (Emulator oder physisches Gerät)
npx expo start --android
```

### 5.5 Web-Deployment

```bash
npx expo export -p web      # statische Site nach ./dist
```

`./dist` auf Vercel/Netlify hosten — Details in [`DEPLOY.md`](DEPLOY.md).

---

## 6. Erklärung zur Verwendung generativer KI

Bei der Erstellung dieser Arbeit wurde unterstützend das KI-System **Antigravity** eingesetzt. Das Tool wurde projektübergreifend für Vervollständigungsvorschläge, Syntaxhilfen, Optimierungsimpulse und Unterstützung bei der Fehlerbehebung verwendet. Alle generierten Inhalte wurden manuell geprüft, angepasst oder vollständig selbst implementiert.

