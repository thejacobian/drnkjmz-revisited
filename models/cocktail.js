const mongoose = require('mongoose');

const cocktailSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  directions: { type: String, required: true },
  cId: String,
  genres: [String],
  img: String,
});

cocktailSchema.index({ name: 'text', directions: 'text', genres: 'text' });

const Cocktail = mongoose.model('Cocktail', cocktailSchema);

module.exports = Cocktail;
