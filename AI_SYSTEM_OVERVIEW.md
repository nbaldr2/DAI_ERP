# Dai Trading ERP System - AI Overview & Context

## 1. System Purpose & Scope
This is a comprehensive, production-ready full-stack Enterprise Resource Planning (ERP) system tailored for Dai Trading, specifically designed with Qatar compliance in mind. It handles end-to-end operational functionality including inventory, sales, procurement, warehousing, waste tracking, accounting, and auditing.

## 2. Tech Stack
- **Backend:** Node.js 18+, Express.js 4.18, MySQL 8.0, Sequelize ORM 6.35.
- **Frontend:** React 18, Vite, React Router v6, TailwindCSS 3.3, Axios, react-i18next (for Bilingual EN/AR support).
- **Security:** JSON Web Tokens (JWT) for authentication, bcryptjs, Helmet, CORS.

## 3. Core Architectural Patterns (CRITICAL CONTEXT)
- **Immutable Inventory Ledger:** The system operates on a ledger-based inventory logic. Direct quantity updates on stock batches are strictly prohibited. Every stock movement (e.g., RECEIPT, SALE, WASTE, TRANSFER) MUST be recorded in the `inventory_ledger` table with a calculable `balance_after`. The available stock quantity is purely derived from the most recent ledger entry.
- **Transactional Safety & Row Locking:** Operations affecting inventory or financials must be wrapped in explicit Database Transactions combined with row-level locking (`SELECT FOR UPDATE`). This prevents overselling and concurrent update race conditions.
- **Optimistic Locking:** The `StockEntry` model utilizes a `version` field. When making API requests (e.g. PUT), clients must send the current version. The server increments it if matched, or throws a `409 Conflict` if there's a mismatch.
- **Soft Deletes:** Key models utilize `deleted_at` fields (Sequelize's `paranoid` configuration). This ensures data preservation, auditability, and compliance.
- **Audit Trail:** Almost EVERY data mutation (Create/Update/Delete) is actively logged in the `AuditLog` table. This logs `old_value`, `new_value`, user attribution, IP addresses, and timestamps.
- **Role-Based Access Control (RBAC):** There are 5 strict permission levels: `ADMIN`, `WAREHOUSE`, `SALES`, `ACCOUNTANT`, and `VIEWER`. Routes must be protected utilizing designated RBAC middleware.

## 4. Key Database Entities
- **Products:** The catalog of items being traded. Includes bilingual fields (`name_en`, `name_ar`), categorisation, base price, unit type, and expiry alert window.
- **StockEntries:** Instances of inventory/lots/batches received. Linked tightly to Products, Warehouses, and Suppliers. Stores total weight/pallets and exact `expiry_date`.
- **InventoryLedger:** The single source of truth for stock levels tracking all modifications referencing a StockEntry.
- **Sales & WasteDamage:** Transactional events that decrement inventory via the ledger.
- **Purchases & Invoices:** Accounting and billing records that link back to Suppliers, Customers, and Products. Includes specific logic for PDF generation and QR code compliance.
- **Users / Warehouses / Suppliers / Customers:** System configuration entities.

## 5. Development Guidelines & Workflows
- **Separation of Concerns:** 
  - Controllers only parse requests, validate input, and dispatch responses.
  - Services (e.g. `StockService`) contain all business logic, transactions, locking mechanisms, and ledger mutations. All complex backend workflows must reside here.
- **Handling Stock Modifications:** Never adjust physical stock availability without utilizing the ledger system. A quantity change requires initiating a transaction, locking the row, validating availability, creating the reference event (e.g. `Sale`), adding a ledger row, and committing.
- **Translation / i18n:** Always anticipate RTL format and bilingual requirements for front-facing components, exports, PDFs, and core product properties.

## 6. Directory Structure
```
dai-trading2/
├── backend/
│   ├── src/
│   │   ├── config/       (Sequelize & environment config)
│   │   ├── models/       (DB schemas including scopes and associations)
│   │   ├── controllers/  (Route handlers)
│   │   ├── services/     (Business logic + Transactions)
│   │   ├── routes/       (Express endpoints)
│   │   ├── middlewares/  (Auth, validation, RBAC)
│   │   ├── migrations/   (Sequelize state definitions)
│   │   ├── seeders/      (Mock data population)
│   │   └── jobs/         (Node-cron jobs like expiryAlerts)
├── frontend/
│   ├── src/
│   │   ├── components/   (Reusable UI elements)
│   │   ├── pages/        (Primary view components matching routes)
│   │   ├── services/     (Axios-based API wrappers)
│   │   ├── hooks/        (React lifecycle utilities)
│   │   └── i18n/         (Translation files)
```

## 7. Current Project Phase
The backend infrastructure, core logic, API endpoints, auditing, and database layer are 100% complete and fully tested. Development is actively focused on assembling the React frontend pages, consuming these APIs, and adding client-side business interactions to mirror backend capabilities.
