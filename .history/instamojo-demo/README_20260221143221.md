# Instamojo Payment Gateway Demo

A demo application for Instamojo Payment Gateway integration with **built-in demo mode** - works without API credentials!

## Features

- ✅ **Demo Mode** - Test without API credentials
- ✅ Create payment requests
- ✅ Simulated payment flow
- ✅ Payment callbacks handling
- ✅ Webhook support
- ✅ Payment status check
- ✅ Refund processing
- ✅ Test mode support

## Quick Start

### 1. Install Dependencies

```bash
cd instamojo-demo
npm install
```

### 2. Run the Server

```bash
npm start
```

The server will start on http://localhost:5007

**That's it!** The demo works in simulation mode without any configuration.

### 3. Test the Payment Flow

1. Open http://localhost:5007 in your browser
2. Enter an amount (minimum ₹10)
3. Click "Pay"
4. You'll see a simulated payment page
5. Click "Simulate Success" or "Simulate Failure"
6. See the result

## Getting Real API Credentials

To accept real payments:

### 1. Sign Up at Instamojo

1. Go to https://www.instamojo.com/
2. Click "Sign Up" 
3. Enter your email and phone
4. Verify with OTP
5. **No business documents needed for test mode!**

### 2. Get API Credentials

1. Log in to Instamojo Dashboard
2. Go to **Settings → API & Plugins**
3. You'll see:
   - **API Key**
   - **Auth Token**
   - **Salt**

### 3. Update Configuration

Edit `.env` file:

```env
INSTAMOJO_API_KEY=your_actual_api_key
INSTAMOJO_AUTH_TOKEN=your_actual_auth_token
INSTAMOJO_SALT=your_actual_salt
INSTAMOJO_TEST_MODE=true
```

### 4. Restart Server

```bash
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Get configuration |
| GET | `/api/test-cards` | Get test card info |
| POST | `/api/create-payment` | Create payment request |
| GET | `/api/payment/callback` | Payment redirect handler |
| POST | `/api/payment/webhook` | Webhook handler |
| GET | `/api/payment/:id` | Get payment details |
| GET | `/api/payment-request/:id` | Get payment request details |
| POST | `/api/refund` | Process refund |

## Payment Flow

### Demo Mode (No Credentials)
1. Create payment → Returns demo payment URL
2. Redirect to simulated payment page
3. User clicks Success/Fail
4. Redirect back with result

### Production Mode (With Credentials)
1. Create payment → Returns Instamojo payment URL
2. Redirect to Instamojo checkout
3. User completes payment
4. Instamojo redirects back
5. Webhook notification received

## Test Mode vs Production

### Test Mode (INSTAMOJO_TEST_MODE=true)
- Uses `test.instamojo.com` API
- No real money involved
- Immediate activation

### Production Mode (INSTAMOJO_TEST_MODE=false)
- Uses `www.instamojo.com` API
- Real payments
- Requires business verification

## Troubleshooting

### Port Already in Use
The server automatically finds a free port starting from 5007.

### Payment Not Working
1. Check if credentials are correct
2. Verify TEST_MODE is set correctly
3. Check server logs for errors

### Callback Not Received
1. Ensure your server is accessible from internet
2. For local testing, use ngrok or similar

## Why Instamojo?

- ✅ **Quick Registration** - Just email/phone verification
- ✅ **No Initial Documents** - Start testing immediately
- ✅ **Easy Integration** - Simple REST API
- ✅ **Popular in India** - Trusted by small businesses
- ✅ **UPI Support** - Accept UPI payments
- ✅ **Low Fees** - Competitive pricing

## Production Checklist

Before going live:

- [ ] Update credentials to production values
- [ ] Set `INSTAMOJO_TEST_MODE=false`
- [ ] Update redirect URLs to production
- [ ] Set up webhook endpoint
- [ ] Test with small amounts first
- [ ] Complete business verification

## License

ISC
