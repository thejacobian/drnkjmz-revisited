/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-prototype-builtins */
const express = require('express');
const request = require('request');

const router = express.Router();
const Cocktail = require('../models/cocktail');

// populate cocktails from DB import file
const cocktailsData = require('../populateCocktails');

// // add require login middleware
const requireLogin = require('../middleware/requireLogin');
// const showMessagesAndUsername = require('../middleware/showSessionMessages');

// Utility function from Stack Overflow to see if an object is empty
const isEmpty = (obj) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) { return false; }
  }
  return true;
};

// Add the cocktails test data if the collection is empty
const populateCocktailsFunc = async () => {
  cocktailsData.forEach(async (cocktail) => {
    // get the images for the cocktails from an API call since we did not scrape these
    await request(`https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${cocktail.cId}`,
      (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const parsedBody = JSON.parse(body);
          const imageUrl = parsedBody.drinks[0].strDrinkThumb;
          // create the cocktails in our MongoDb.
          Cocktail.create({
            name: cocktail.name,
            directions: cocktail.directions,
            cId: cocktail.cId,
            genres: [cocktail.genre],
            img: imageUrl,
          }, (err, createdCocktail) => {
            if (err) {
              console.log(err);
            } else {
              // console.log(createdCocktail);
            }
          });
        }
      });
  });
};

// INDEX ROUTE for debugging/admin purposes
router.get('/getAllCocktails', async (req, res) => {
  try {
    const cocktails = await Cocktail.find({}).sort();
    if (isEmpty(cocktails)) {
      populateCocktailsFunc();
    }
    res.json({
      data: cocktails,
      status: 200,
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: 500,
      data: err,
    });
  }
});

// CREATE ROUTE
router.post('/', requireLogin, async (req, res) => {
  try {
    // handle genres for new cocktail
    const temp = req.body.genres;
    req.body.genres = [];
    req.body.genres.push(temp);

    const newCocktail = await Cocktail.create(req.body);
    res.json({
      status: 200,
      data: newCocktail,
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: 500,
      data: err,
    });
  }
});

// UPDATE ROUTE
router.put('/', requireLogin, async (req, res) => {
  try {
    // handle genres for new cocktail
    // const temp = req.body.genres;
    // req.body.genres = [];
    // req.body.genres.push(temp);
    if (req.session.sP_id === '5cf9d13919d9e0a353b8164c') {
      const updatedCocktail = await Cocktail.findByIdAndUpdate(req.body._id, req.body, { new: true });
      await updatedCocktail.save();
      res.json({
        status: 200,
        data: updatedCocktail,
      });
    } else {
      req.session.message = 'You do not have access to update cocktails';
      // console.log(req.session.message);
      res.json({
        status: 404,
        data: null,
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      status: 500,
      data: err,
    });
  }
});

// DELETE ROUTE
router.delete('/:id', requireLogin, async (req, res) => {
  try {
    if (req.session.sP_id === '5cf9d13919d9e0a353b8164c') {
      const deletedCocktail = await Cocktail.findByIdAndDelete(req.params.id);
      res.json({
        status: 200,
        data: deletedCocktail,
      });
    } else {
      req.session.message = 'You do not have access to delete cocktails';
      // console.log(req.session.message);
      res.json({
        status: 404,
        data: null,
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      status: 500,
      data: err,
    });
  }
});

// SEARCH route
router.post('/search', async (req, res) => {
  try {
    let currMatchingCocktails = [];
    let allMatchingCocktails = [];

    const artistGenres = req.body.genres;

    for (let i = 0; i < artistGenres.length; i++) {
      // const genreLowerCase = genre.toLocaleLowerCase();
      const genreLowerCase = artistGenres[i].toLocaleLowerCase();
      // search for exact genre matching cocktails first
      currMatchingCocktails = await Cocktail.find({ genres: genreLowerCase });
      // if empty search for wildcard exact genres
      if (isEmpty(currMatchingCocktails)) {
        currMatchingCocktails = await Cocktail.find({ genres: { $regex: genreLowerCase } });
      }

      // search for sub-genre matching cocktails split on space and dash
      if (isEmpty(currMatchingCocktails)) {
        const subGenres = genreLowerCase.split(/-| /);
        for (let x = 0; x < subGenres.length; x++) {
          if (subGenres[x] !== 'and') {
            currMatchingCocktails = [...currMatchingCocktails, ...await Cocktail.find({ genres: { $regex: subGenres[x] } })];
          }
        }
      }
      allMatchingCocktails = [...allMatchingCocktails, ...currMatchingCocktails];
    }

    let matchingCocktail;
    let randomCocktailIndex;
    // just return any matching cocktail if none found by genre
    if (isEmpty(allMatchingCocktails)) {
      // random mongoDB item from collection found on stack overflow
      const count = await Cocktail.countDocuments({});
      randomCocktailIndex = Math.floor(Math.random() * count);
      matchingCocktail = await Cocktail.findOne().skip(randomCocktailIndex);
      // console.log('No matching cocktails, returning a random one!');
    } else { // return one of the cocktails that is matching the genres
      randomCocktailIndex = Math.floor(Math.random() * allMatchingCocktails.length);
      matchingCocktail = allMatchingCocktails[randomCocktailIndex];
      // console.log(`Returning a matching cocktail: ${matchingCocktail}`);
    }

    res.json({
      data: matchingCocktail,
      status: 200,
    });
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

module.exports = router;
