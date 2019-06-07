const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  sP_id: { type: String, required: true, unique: true },
  // username: String,
  // password: { type: String, required: true },
  display_name: String,
  // email: String,
  // birthdate: String,
  city: String,
  state: String,
  country: String,
  country_code: String,
  postal_code: String,
  ip: String,
  cocktails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cocktail' }],
});

const User = mongoose.model('User', userSchema);
module.exports = User;
