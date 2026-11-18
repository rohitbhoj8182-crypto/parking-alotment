# Bayline – Parking Allotment System (MERN, MVC)

Drivers see every parking bay as a coloured tile: **green = vacant, red = occupied**.
They filter by **public / private**, **free / paid** and **small / large**, then book a bay with their vehicle number.
Admins create parkings (name, description, place, size) with their slots, edit or remove them, and can release any car. Drivers see slots grouped by parking and can filter by parking.

## Run it

You need Node 18+ and MongoDB running locally (or an Atlas URI).

```bash
# 1. API
cd server
npm install
cp .env.example .env      # edit MONGO_URI / JWT_SECRET if needed
npm run seed              # creates demo users + 22 slots
npm run dev               # http://localhost:5000

# 2. Web app (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

Demo logins (created by the seed): admin `admin@parking.com / Admin@123`, user `user@parking.com / User@123`.
Private slots in the seed use access code `1234`.

## MVC layout

| Layer | Where | Job |
|---|---|---|
| **Model** | `server/src/models` | Mongoose schemas, validation, indexes (User, Slot, Booking) |
| **Controller** | `server/src/controllers` | Business rules: booking, releasing, pricing, filtering |
| **Routes** | `server/src/routes` | Maps URLs to controllers and applies auth middleware |
| **View** | `client/src` | React pages and components; talks to the API only through `api.js` |

```
server/src  app.js  config/db.js  middleware/{auth,error}.js  utils/  seed.js
client/src  pages/  components/  context/AuthContext.jsx  styles.css
```

## Sign up and log in

Open the app, choose **Create an account**, and enter your name, email (a Gmail address works) and a password of 6+ characters. After that, **Log in** with the same email and password.

## Admin access (secret key)

Admins sign in from a separate page, **Admin login** (link at the bottom of the normal login, or `/admin-login`).
Every admin sign-up and sign-in needs the **secret key**, which only you know.

1. Set it in `server/.env`: `ADMIN_SECRET_KEY=` followed by a long random value. Without it, admin sign-in is switched off.
2. Give the key to the people you trust. They open **Admin login**, choose **Sign up** (new admin) or **Log in**, and enter email, password and the key.
3. Admins can create parkings and slots on **Manage parking** and release any car.

Details: the key is checked on the server in constant time and is never stored in the database or the browser. Admin endpoints are limited to 10 tries per 15 minutes. Normal sign-up can never create an admin, and an admin account cannot log in through the normal login page. The seeded `admin@parking.com / Admin@123` also needs the key, so change `ADMIN_SECRET_KEY` before going live. To revoke an admin, change the key and delete or demote their user in the database.

## Parking rules

- **Public** slot: any logged-in user can book it. **Private** slot: the user must also enter the slot's access code (stored hashed, never sent to the browser).
- **Free** slot costs nothing. **Paid** slot is billed `price per hour × started hours` (minimum 1 hour) when the car is released.
- **Small** slot fits small cars only. **Large** slot fits small and large cars.
- A vehicle number can be parked in only one place at a time.
- Booking turns the tile red. Releasing turns it green again. The dashboard also refreshes itself every 15 seconds.
- A user only ever sees *which* slots are occupied, never who is in them. Your own car gets a blue outline and a Release button.

## How the database works

Four collections:

| Collection | Key fields |
|---|---|
| `users` | name, email (unique), password (bcrypt hash), role (`user`/`admin`) |
| `parkinglots` | name (unique, case-insensitive), description, place, size (how many slots it holds), createdBy |
| `slots` | **lot**, code (unique), type, pricing, pricePerHour, vehicleSize, accessCode (hash), **status** (`vacant`/`occupied`), occupiedBy, currentBooking |
| `bookings` | user, slot, vehicleNumber, vehicleSize, startTime, endTime, amount, status (`active`/`completed`), plus a snapshot of the parking name, slot code, type, pricing and price |

`slots.status` is the single field that drives the red/green colour. The dashboard reads it directly, so it never has to join or scan bookings.

### Indexes (and which query each one serves)

| Index | Purpose |
|---|---|
| `users.email` unique | login lookup, no duplicate accounts |
| `parkinglots.name` unique, case-insensitive collation | no two parkings with the same name |
| `slots.code` unique | no duplicate slot codes |
| `slots {lot, status}` and `{lot, code}` | per-parking vacant/occupied counts, capacity check, slots of one parking in order |
| `slots {status, type, pricing, vehicleSize}` | every dashboard filter combination is a single index scan; the status counter (`$group`) uses the same index |
| `bookings {user, createdAt:-1}` | "My bookings", newest first, no in-memory sort |
| `bookings {status, createdAt:-1}` | admin "parked now" list |
| `bookings {slot}` **unique, partial** (`status: active`) | the database itself refuses a second active booking for the same slot |
| `bookings {vehicleNumber}` **unique, partial** (`status: active`) | the database itself refuses the same car being parked twice |

The partial indexes only cover active bookings, so history never blocks a new booking and the indexes stay small.

### Query optimisation

- Reads use `.select()` for only the fields the screen needs and `.lean()` to skip Mongoose object overhead.
- Lists are capped (`limit(500)` for slots, `limit(200)` admin bookings, 20 per page for history).
- Slot counts come from one aggregation instead of loading documents.
- Booking history stores a snapshot of the slot details, so history pages never need a `populate` or join.
- Filter values are whitelisted and must be plain strings, which also blocks NoSQL operator injection (`?type[$ne]=x`).

### Making it hold up under real problems

| Problem | How it is handled |
|---|---|
| **Two people book the same slot at the same moment** | Booking first runs one atomic `findOneAndUpdate({_id, status:'vacant'} → occupied)`. MongoDB lets exactly one request win; the other gets "slot was just taken". The unique partial index on `bookings.slot` is a second safety net. |
| **Same car booked twice** | Unique partial index on active `vehicleNumber`. If it triggers, the slot is given back automatically. |
| **Double release / double click** | Release is an atomic `findOneAndUpdate({_id, status:'active'})`, so only one call can succeed and the amount is charged once. |
| **Server crashes halfway through a booking or release** | The two writes are ordered so a crash can only leave a slot marked occupied, never a double booking. On every startup `utils/reconcile.js` finds occupied slots with no active booking and frees them. Slots created before parkings existed are moved into a "General Parking" parking automatically on startup (`utils/migrate.js`), and `npm run seed` then sorts them into the demo parkings. (Transactions were deliberately not used so the app also runs on a single-node MongoDB, which has no transaction support.) |
| **Deleting a slot with a car in it** | Delete is `findOneAndDelete({_id, status:'vacant'})`; occupied slots cannot be deleted or edited. |
| **Editing a slot later changes old receipts** | Bookings keep their own snapshot of price, code and type. |
| **Bad data** | Schema validation (enums, min/max, regex email, paid slots need a price, private slots need an access code), plus plate format check. Free slots are forced to price 0. |
| **Missing indexes in production** | `db.js` awaits `Model.init()` for all models before the server starts listening. |
| **Leaked credentials** | Passwords and access codes are bcrypt hashes and `select:false`, so they are never returned by normal queries. |
| **Privilege escalation** | Public registration always creates role `user`. Admins come only from the seed script (or by editing the DB). |
| **Brute force / abuse** | Rate limit on `/api/auth`, 10 kb body limit, Helmet headers, CORS limited to `CLIENT_URL`. |
| **Bad requests** | A central error handler turns duplicate-key, validation and bad-id errors into clear 4xx messages; unexpected errors return a generic 500 and are only logged server-side. |

## API

All routes except register/login need `Authorization: Bearer <token>`.

| Method | Route | Who | Notes |
|---|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public | returns token + user |
| POST | `/api/auth/admin/register`, `/api/auth/admin/login` | needs secret key | `{name?, email, password, secretKey}`; returns token + admin user |
| GET | `/api/auth/me` | user | |
| GET | `/api/lots` | user | every parking with name, place, description, size and live vacant/occupied counts |
| POST | `/api/lots` | admin | `{name, place, description, size, prefix, type, pricing, pricePerHour, vehicleSize, accessCode?}` creates the parking and its `size` slots (e.g. A01 to A20) in one step; rolled back if any part fails |
| PUT / DELETE | `/api/lots/:id` | admin | size cannot go below the current slot count; delete only when nobody is parked there |
| GET | `/api/slots?lot=&type=&pricing=&vehicleSize=&status=` | user | filters are optional |
| GET | `/api/slots/stats?lot=` | user | `{vacant, occupied, total}` |
| POST | `/api/slots` | admin | add one slot to a parking `{lot, code, ...}`; refused when the parking is full (size reached) |
| PUT / DELETE | `/api/slots/:id` | admin | only on vacant slots; a blank access code on PUT keeps the current one |
| POST | `/api/bookings` | user | `{slotId, vehicleNumber, vehicleSize, accessCode?}` |
| GET | `/api/bookings/mine?page=1` | user | |
| GET | `/api/bookings/active` | admin | |
| PATCH | `/api/bookings/:id/release` | owner or admin | returns final amount |

## Production notes

Set a long random `JWT_SECRET`, set `NODE_ENV=production`, set `CLIENT_URL` to your site, run `npm run build` in `client` and serve `dist` from any static host (point `/api` at the server). Use MongoDB Atlas or a replica set for backups and high availability.
