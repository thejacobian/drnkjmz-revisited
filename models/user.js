const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: String,
  cocktails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cocktail' }],
});

const User = mongoose.model('User', userSchema);
module.exports = User;
