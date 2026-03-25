const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const superadmins = await User.find({ role: 'superadmin' });
  console.log("Superadmins found:");
  superadmins.forEach(sa => {
    console.log(`- Email: ${sa.email}`);
    if (sa.resetPasswordToken) {
      console.log(`  [A reset token is currently active in the database for this user]`);
    } else {
      console.log(`  [No active reset token]`);
    }
  });
  mongoose.connection.close();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
