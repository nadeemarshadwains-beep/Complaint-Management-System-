# WASA Gujrat Bill Distribution

This project is a browser-based billing distribution tool made for monthly WASA consumer billing.

## Features

- Upload Excel or CSV billing files
- Auto-read consumer names, mobile numbers, billing month, due dates, and amounts
- Preview and edit the SMS message template before sending
- Send billing SMS to all consumers with a configurable SMS API URL
- Show a summary of total amount, consumer count, and due count
- Support recurring monthly uploads in the same workflow
- Include official billing site reference: https://dbill.wasagujrat.gop.pk

## Required Excel / CSV columns

The upload file can include any of these common names:

- consumer_name / customer_name / name
- consumer_number / customer_number / consumer_no / account_number
- mobile_number / mobile / phone / contact
- billing_month / bill_month / month
- due_date
- amount
- amount_after_due_date / after_due_amount / late_amount
- bill_reference / reference / bill_no / reference_number

## Example CSV row

```csv
consumer_name,consumer_number,mobile_number,reference_number,bill_reference,billing_month,due_date,amount,amount_after_due_date
Ali Khan,CN-1001,03001234567,REF-1001,BR-1001,August 2026,2026-08-20,2500,2750
```

## How to use

1. Open the application in a browser.
2. Choose the monthly Excel/CSV file.
3. Review the imported data in the table.
4. Adjust the SMS message template if needed.
5. Enter your SMS gateway URL and token if you want live sending.
6. Click "Send SMS to all consumers".

## Live SMS integration

The app is ready to connect to a gateway that accepts an HTTP POST request. If you want real sending, add your gateway URL, key, and sender ID in the form.

If no live gateway is configured, the app works in simulation mode and shows the generated message for each consumer.

## Files

- `index.html` - dashboard layout
- `style.css` - visual styling
- `app.js` - upload, parsing, SMS template, and billing logic

## Suggested launch command

Open the folder in a browser or run a quick static server:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Running the optional SMS proxy (recommended for live sending and to avoid CORS)

Steps:

1. Create a Node environment and install dependencies in the `server` folder:

```bash
cd server
npm install
```

2. Copy the example env file and fill your provider credentials:

```bash
cp .env.example .env
# edit .env and set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, or VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM
```

3. Start the proxy:

```bash
npm start
```

4. In the browser app (index.html / settings), set the "Custom gateway URL" to your proxy endpoint, for example:

```
http://localhost:3000/api/send
```

Set the provider in the app to the same provider you configured on the server (twilio, vonage, or custom). The app will POST to the proxy which will use server-side credentials to call the SMS provider.

Security note: Do not commit your real credentials to the repository. Use environment variables or a secrets manager in production.
