# Eventim Backend Test

Welcome to the Eventim backend test for new hires. The purpose of this test is to evaluate how you work with an existing codebase and extend it with new functionality.

## Tech Stack

- Node 22
- Express JS
- PostgreSQL
- MongoDB
- Docker

This API uses two data sources: Events and Tickets are stored in PostgreSQL, and settings should be stored as documents in MongoDB.

## Setup

See the [root README](../../README.md) for running the project (with and without Nix) and the QA process.

## Tasks

### 1. Settings feature

Implement a settings feature backed by MongoDB (the Mongo instance is already running via Docker Compose):

- `GET /settings` — return the current settings document
- `POST /settings` — create or update the settings document

You decide the shape of the settings document. Look at the existing code structure to understand how the project is organized and follow the same patterns.

### 2. Pagination

`GET /events` currently returns a hardcoded number of results. Implement proper pagination support — the consumer should be able to request a specific page and page size. Think about the response shape and how the frontend would use it.

### 3. Code quality

Review the existing codebase before submitting. If you find any bugs, performance issues, or code quality concerns, fix them. In your pull request description, explain what you changed and why.

### 4. Tests

All new code must be unit tested. Any existing code you modify should also have tests.
