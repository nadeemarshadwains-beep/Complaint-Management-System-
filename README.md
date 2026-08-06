# Complaint Management System

A lightweight browser-based complaint management application for a revenue department.

## Features

- Consumer can submit complaints without login.
- Track complaints by complaint number.
- Verification officer can log in and verify new complaints.
- Staff can log in to process verified complaints and mark them as handled.
- Admin can log in to view all complaints including pending and solved cases.
- Complaint data is stored locally in the browser using `localStorage`.

## How to use

1. Open `index.html` in a browser.
2. Use the consumer form to register a new billing complaint.
3. Track the complaint using its complaint number.
4. Log in as a field officer, billing officer, ADR, or DDR to progress the complaint through the workflow.

## Test Accounts

- Verification Officer: `verify` / `verify123`
- Staff: `staff` / `staff123`
- Admin: `admin` / `admin123`

## Files

- `index.html` - Application UI and page layout.
- `style.css` - Visual styling and responsive layout.
- `app.js` - Application logic for complaint submission, role-based workflow, and local storage.
