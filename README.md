This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# About project

    A smart irrigation systeme for various actuators and sensors and hardware dev board communicating with a centralized nextjs server Synchronised in real time with a user interface for real time field data tracking and managing device state , this project was a reimplimentation of the ioseeds project ( in python django ) while applying new technologies , new features and respecting IOT projects best practices.
    According to this paper [MemoMasterAbderrahmane](https://di.univ-blida.dz/jspui/handle/123456789/31622) 
    this project folows these rules and for all other iot irrigation systems it can hundel systems server going down or out of reach ( very possible for isolated farming fields ) the esp board can control scheduled irrigation sessions according to systems configurations , avoiding real ressources wasting


## Getting Started

### First, Add a .env file in the root folder containing : 

```bash
# ── Database ──────────────────────────────────────────────────────────────────
DB_NAME=
DB_USER=
DB_PASSWORD=

# -- Add these variables explicitaly for the docker file to run

DATABASE_URL="postgresql://user:password@localhost:5432/dbName"

# ── MQTT ─────────────────────────────────────────────────────────────────────
MQTT_BROKER_URL=
MQTT_USER=
MQTT_PASSWORD=
WORKER_SECRET=
WORKER_HTTP_URL=

# ── App ───────────────────────────────────────────────────────────────────────
NODE_ENV=

# better Auth
BETTER_AUTH_SECRET=
NEXT_PUBLIC_BETTER_AUTH_URL=
```

### Second, set the app envirenment for postgres database and mosquito local hosted mqtt broker

set specific system variables or keep the defaults in the docker-compose.yml then run

```bash
docker compose up
```
### Third, run the seeds file ( example testing data + default data )

```bash
npx tsx prisma/seed.ts
```

### Forth, run the development server:

** Note that using this dev:all is for running both the node app and the mqtt worker included "

```bash
npm run dev:all
# or
yarn dev:all
# or
pnpm dev:all
# or
bun dev:all
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## System Architecture

- Self-hosted Mosquitto (MQTT) for device messaging
- PostgreSQL + Mosquitto (MQTT) via Docker Compose (running locally)
- Prisma v7 (pg adapter) for relational data;
- Next.js + Shadcn for frontend; SSE for real-time updates
- BetterAuth.js with JWT for auth
- Prisma schema and seed file are complete and working


### Infrastructure

- Docker Compose runs PostgreSQL and Mosquitto locally


### Schema

- Domain model: FarmingUnite → IrrigationField → MCU → Sensor/Actuator
SensorType / ActuatorType tables
- EnvironmentData / Action for telemetry and control
- TriggerType enum: AUTONOMOUS / SCHEDULED / MANUAL
Schedule attached to Actuator
- Full RBAC via Role / RoleMember / RoleFunctionality / Functionality junction tables, with per-functionality CRUD flags
- AuditLog with Json old/new values; ConnectionLog
- Wilaya modeled as a 58-row table
- cuid() IDs; Prisma client generated into ./generated/prisma

## Seeding

prisma/seed.ts populates all reference data, an admin user, and sample farm/field/MCU/sensor/actuator records
Fixed , import paths .;.

### DAL design

-trpc based Data Access Layer with public and protected precedures for valide, controled and secure data access

### UI

-NextJs (Reac based) + shadcn ui library Components ( Sidebar, charts, cards ... )
-Zustand store for irrigation fileds data access

### Hardware

-using an esp 32 dev board to run a sketch (c++ based system0) for basic mqtt pub sub operations designed by the system

## System fonctionalities and interfaces

* Provides secure user authentication and access to the application.

![Login](<images/Capture d’écran 2026-09-11 123226.png>) 
 
* Displays real-time field conditions, sensor readings, and quick controls for actuators.

![RealTimeDashboard](<images/Capture d’écran 2026-09-11 122715.png>)

* Allows users to view and manage farm information, status, and location.

![FarmDetils](<images/Capture d’écran 2026-09-11 123034.png>) 

* Allows users to create, schedule, modify, and activate/deactivate irrigation programs.

![Schedules](<images/Capture d’écran 2026-09-11 123013.png>) 
  
* Allows users to configure an MCU, its associated field, control mode, update interval, and irrigation thresholds.

![CRUDUpdatingActuator](<images/Capture d’écran 2026-09-11 122948.png>) 
  
* Resource Management ( crud operations ): Includes navigation tabs to switch between field plots, MCUs, raw sensors, and physical actuators, alongside controls to add (+ Ajouter parcelle), edit, or remove specific field configurations.

![AllCRUD](<images/Capture d’écran 2026-09-11 122901.png>)

* only for users with admin group access 
 - User Registry: Provides a centralized administrative view listing all registered platform users, including their account names, email addresses, assigned locations/regions (Wilaya), system roles (e.g., Admin), active/inactive status, and creation dates.


![Users](<images/Capture d’écran 2026-09-11 123056.png>)

* Dashboard Control Panel (Left): Features real-time quick actions to open/close field valves (e.g., Valve-A11) and records a log of recent manual and automated activities with timestamps.

* IDE & Serial Monitor (Right): Shows the firmware code running on an ESP32 microcontroller along with a serial execution log. It displays real-time telemetry output, including sensor transmissions, Wi-Fi status, and inbound MQTT command payloads (OPEN).

![espToAppRealTimeComunication](<images/Capture d'écran 2026-09-11 122124.png>)

## Learn More
to learn more about ioseeds project idea and bibliographical resources check :

[MemoMasterAbderrahmane](https://di.univ-blida.dz/jspui/handle/123456789/31622) 

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Next phase: 
	- [ ] setting rbac ( role based access ) all around the app  
	- [ ] Statistics
	- [ ] Real time notifications push
	- [ ] which data is best recomended for auto ai driven irrigation systems ( check comunity ) to train future ai models


