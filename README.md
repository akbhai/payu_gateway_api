# PayU Gateway API

PayU card checker using Puppeteer automation.

## Deployment

### Railway

1. Connect this repo to Railway
2. Railway will auto-detect Node.js
3. Set environment variables (if needed)
4. Deploy!

### API Endpoint

```
POST /check
Content-Type: application/json

{
  "cc": "4111111111111111",
  "mm": "12",
  "yyyy": "2025",
  "cvv": "123"
}
```

### Response

```json
{
  "status": "LIVE",
  "message": "3D Secure Required 🔐",
  "time": "35.2s",
  "amount": "₹1"
}
```

### Status Types

- `LIVE` - Card valid, 3DS/OTP required
- `CHARGED` - Payment successful
- `DECLINED` - Card declined
- `DEAD` - Invalid card
- `CCN` - Insufficient funds

## Local Development

```bash
npm install
node legend.js
```

Server runs on port 3000.
