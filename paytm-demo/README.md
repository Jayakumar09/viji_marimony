# Paytm Payment Gateway Demo

A simple demo application to test Paytm Payment Gateway integration in test mode.

## Features

- ✅ Create payment orders
- ✅ Redirect to Paytm payment page
- ✅ Handle payment callbacks
- ✅ Check payment status
- ✅ Process refunds
- ✅ Test mode support

## Quick Start

### 1. Install Dependencies

```bash
cd paytm-demo
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your Paytm credentials:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```
PAYTM_MERCHANT_ID=your_merchant_id
PAYTM_MERCHANT_KEY=your_merchant_key
PAYTM_WEBSITE=WEBSTAGING
PAYTM_CHANNEL_ID=WEB
PAYTM_INDUSTRY_TYPE_ID=Retail
PAYTM_TEST_MODE=true
```

### 3. Get Paytm Credentials

1. Go to [Paytm Dashboard](https://dashboard.paytm.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Copy your **Merchant ID** and **Merchant Key**
5. For testing, use `WEBSTAGING` as website name

### 4. Run the Server

```bash
npm start
```

The server will start on http://localhost:5006

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Get Paytm configuration |
| GET | `/api/test-cards` | Get test card numbers |
| POST | `/api/create-order` | Create a new payment order |
| POST | `/api/payment/callback` | Payment callback (Paytm redirects here) |
| POST | `/api/payment/status` | Check payment status |
| POST | `/api/refund` | Process a refund |

## Test Cards

| Card Number | Type |
|-------------|------|
| 4111 1111 1111 1111 | Visa - Success |
| 5267 3181 8792 6173 | Mastercard - Success |
| 4000 0000 0000 0002 | Visa - Failure |

**Note:** Use any future expiry date and any CVV.

For UPI testing, use: `success@paytm`

## Payment Flow

1. **Create Order**: Call `/api/create-order` with amount and customer details
2. **Redirect**: Server returns Paytm parameters and URL
3. **Submit Form**: POST the parameters to Paytm
4. **Payment**: User completes payment on Paytm page
5. **Callback**: Paytm redirects to `/api/payment/callback`
6. **Verify**: Server verifies payment and shows result

## Troubleshooting

### Port Already in Use

The server automatically finds a free port starting from 5006.

### Invalid Checksum

Make sure your Merchant Key is correct. The checksum is generated using the key.

### Payment Failing

- Verify your credentials are correct
- Make sure you're using `WEBSTAGING` for test mode
- Check that callback URL is accessible

## Production Checklist

Before going to production:

- [ ] Update `PAYTM_WEBSITE` to your production website name
- [ ] Set `PAYTM_TEST_MODE=false`
- [ ] Update callback URL to production URL
- [ ] Implement proper checksum verification
- [ ] Add payment status verification
- [ ] Set up proper error handling and logging

## License

ISC
