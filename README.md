# Complaint Management System

A lightweight browser-based complaint management application for a revenue department.

## Features

- Consumer can submit complaints without login.
- Track complaints by complaint number.
- Field officers can log in and review complaints assigned to their block.
- Billing officer can review verified complaints and forward them to the Assistant Director Revenue.
- Assistant Director Revenue can add a recommendation and forward the complaint to the Deputy Director Revenue.
- Deputy Director Revenue can approve the final complaint.
- Complaint data is stored locally in the browser using `localStorage`.

## How to use

1. Open `index.html` in a browser.
2. Use the consumer form to register a new billing complaint.
3. Track the complaint using its complaint number.
4. Log in as a field officer, billing officer, ADR, or DDR to progress the complaint through the workflow.

## Test Accounts

- Field Officer A: `fieldA` / `fieldA123`
- Field Officer B: `fieldB` / `fieldB123`
- Billing Officer: `billing` / `billing123`
- Assistant Director Revenue: `adr` / `adr123`
- Deputy Director Revenue: `ddr` / `ddr123`

## Files

- `index.html` - Application UI and page layout.
- `style.css` - Visual styling and responsive layout.
- `app.js` - Application logic for complaint submission, role-based workflow, and local storage.
