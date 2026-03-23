const mongoose = require('mongoose');

async function makeAdmin() {
  await mongoose.connect('mongodb://localhost:27017/auth_db');
  const result = await mongoose.connection.collection('users').updateOne(
    { email: 'azar@gmail.com' },
    { $set: { role: 'admin' } }
  );
  console.log('Updated:', result.modifiedCount, 'user(s)');
  const user = await mongoose.connection.collection('users').findOne({ email: 'azar@gmail.com' });
  console.log('Current role:', user.role);
  mongoose.disconnect();
}

makeAdmin();
