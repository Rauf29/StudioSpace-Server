# StudioSpace Server — Express.js & MongoDB Native API

Backend engine powering the **StudioSpace** peer-to-peer creative workspace platform.

---

## 🛠️ Stack & Architecture

- **Runtime**: Node.js & Express.js
- **Database**: MongoDB.
- **Authentication Verification**: Remote JWKS token verification with `jose` & Better-Auth integration
- **Cross-Origin**: CORS enabled for client port 3000

---

## 📡 Core API Endpoints

### Public Endpoints:

- `GET /api/featured-studios` — Top 6 featured studios
- `GET /api/studios` — Search, filter by category & location, sort by price/rating
- `GET /api/studios/:id` — Single studio detail specification

### Protected Endpoints (Bearer Token required):

- `POST /api/studios` — Create new studio listing
- `PUT /api/studios/:id` — Update listing (Owner only)
- `DELETE /api/studios/:id` — Delete listing (Owner only)
- `GET /api/my-studios` — Current user's listed studios
- `POST /api/bookings` — Request studio reservation with double-booking clash check (Challenge 2)
- `GET /api/my-bookings` — Current creator's reservations
- `PATCH /api/bookings/:id/cancel` — Cancel pending booking
- `GET /api/host-bookings` — Incoming reservations for host's spaces
- `PATCH /api/bookings/:id/status` — Confirm, Complete, or Decline booking

---
