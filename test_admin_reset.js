const axios = require('axios');

async function testAdminReset() {
  const baseUrl = 'http://localhost:5001/api/admin';
  const email = 'ansar@gmail.com';

  try {
    console.log('--- Testing Admin Forgot Password ---');
    const forgotRes = await axios.post(`${baseUrl}/forgot-password`, { email });
    console.log('Forgot Password Status:', forgotRes.status);
    console.log('Reset Token Received:', forgotRes.data.resetToken);

    const resetToken = forgotRes.data.resetToken;

    console.log('\n--- Testing Admin Reset Password ---');
    const resetRes = await axios.put(`${baseUrl}/reset-password/${resetToken}`, {
      password: 'newpassword123'
    });
    console.log('Reset Password Status:', resetRes.status);
    console.log('Message:', resetRes.data.message);

    console.log('\n--- Verifying Admin Login with New Password ---');
    const loginRes = await axios.post(`${baseUrl}/login`, {
      email,
      password: 'newpassword123'
    });
    console.log('Login Status:', loginRes.status);
    console.log('Success:', loginRes.data.success);
    console.log('Admin Role:', loginRes.data.admin.role);

  } catch (error) {
    console.error('Test Failed:', error.response ? error.response.data : error.message);
  }
}

testAdminReset();
