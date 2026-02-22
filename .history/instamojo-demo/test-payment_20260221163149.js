const axios = require('axios');

async function testPayment() {
  try {
    const response = await axios.post('http://localhost:5009/api/create-payment', {
      amount: 100,
      purpose: 'Test Payment',
      buyerName: 'Test User',
      email: 'test@example.com',
      phone: '9999999999'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Success:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testPayment();
