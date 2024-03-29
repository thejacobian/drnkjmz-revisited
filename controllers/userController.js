/* eslint-disable prefer-template */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();
const User = require('../models/user');
const Cocktail = require('../models/cocktail');

// require login middleware
const requireLogin = require('../middleware/requireLogin');
const showMessagesAndUsername = require('../middleware/showSessionMessages');

let geoData = { ip: '::1' };

// adapted from Stack Overflow for basic geolocation detection
const getClientLocationFromIP = async () => {
  try {
    const request = `https://json.geoiplookup.io/${geoData.ip}`;
    const result = await fetch(request);
    const parsedResult = await result.json();
    // console.log(parsedResult);
    return parsedResult;
  } catch (err) {
    console.log(`${err} in the geoiplookup.io ext API call`);
    return null;
  }
};

// INDEX route
router.get('/getAllUsers', async (req, res) => {
  // console.log('INDEX user route hit');
  try {
    const users = await User.find({}).populate('cocktails');
    res.json({
      status: 200,
      data: users,
    });
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

// SHOW route
router.get('/:id', requireLogin, async (req, res) => {

  // console.log('SHOW user route hit');

  try {
    const thisUserDbId = req.session.userDbId;
    if (req.params.id === thisUserDbId) {
      const foundUser = await User.findById(req.params.id).populate('cocktails');
      res.json({
        status: 200,
        data: { _id: foundUser._id, sP_id: foundUser.sP_id, cocktails: foundUser.cocktails },
        currentUser: thisUserDbId,
      });
    } else {
      req.session.message = 'You do not have access to this user';
      // console.log(req.session.message);
      res.json({
        status: 404,
        data: null,
        currentUser: thisUserDbId,
      });
    }
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

// UPDATE route
router.put('/:id', requireLogin, async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  geoData.ip = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (geoData.ip) {
    geoData = await getClientLocationFromIP();
  }
  if (geoData.ip === '::1') {
    geoData.ip = '63.149.97.94';
    geoData.city = 'Denver';
    geoData.district = 'CO';
    geoData.postal_code = '80205';
  }
  // console.log(`UPDATE user route hit: ${geoData.ip}, ${geoData.city}, ${geoData.district}, ${geoData.postal_code}`);

  try {
    const thisUserDbId = req.session.userDbId;
    if (req.params.id === thisUserDbId || req.session.sP_id === '5cf9d13919d9e0a353b8164c') {
      // req.body.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
      const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('cocktails');
      res.json({
        status: 200,
        data: { _id: updatedUser._id, sP_id: updatedUser.sP_id, cocktails: updatedUser.cocktails },
        currentUser: thisUserDbId,
      });
    } else {
      req.session.message = 'You do not have access to update this user';
      // console.log(req.session.message);
      res.send(req.session.message);
      res.json({
        status: 404,
        user: null,
        currentUser: thisUserDbId,
      });
    }
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

// DELETE route
router.delete('/:id', requireLogin, async (req, res) => {
  // console.log('DELETE user route hit');

  try {
    const thisUserDbId = req.session.userDbId;
    if (req.params.id === thisUserDbId || req.session.sP_Id === '5cf9d13919d9e0a353b8164c') {
      const deletedUser = await User.findByIdAndRemove(req.params.id);
      // console.log(deletedUser);
      res.json({
        status: 200,
        deleted: true,
        data: { _id: deletedUser._id, sP_id: deletedUser.sP_id, cocktails: deletedUser.cocktails },
      });
    } else {
      req.session.message = 'You do not have access to delete this user';
      // console.log(req.session.message);
      res.json({
        status: 404,
        deleted: false,
        user: null,
      });
    }
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

// CREATE/REGISTER route
router.post('/register', showMessagesAndUsername, async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  geoData.ip = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (geoData.ip) {
    geoData = await getClientLocationFromIP();
  }
  if (geoData.ip === '::1') {
    geoData.ip = '63.149.97.94';
    geoData.city = 'Denver';
    geoData.district = 'CO';
    geoData.country_code = 'US';
    geoData.postal_code = '80205';
  }
  // console.log(`CREATE/REGISTER user route hit: ${geoData.ip}, ${geoData.city}, ${geoData.district}, ${geoData.postal_code}`);

  try {
    const foundUser = await User.findOne({ sP_id: req.body.sP_id }).populate('cocktails');
    if (!foundUser) {
      const dbUser = req.body;
      if (geoData) {
        dbUser.ip = geoData.ip;
        dbUser.city = geoData.city;
        dbUser.state = geoData.district;
        dbUser.postal_code = geoData.postal_code;
        dbUser.country_code = geoData.country_code;
      }

      const createdUser = await User.create(dbUser);

      req.session.message = '';
      req.session.logged = true;
      req.session.userDbId = createdUser._id;
      req.session.sP_id = createdUser.sP_id;

      res.json({
        status: 200,
        loggedIn: true,
        data: { _id: createdUser._id, sP_id: createdUser.sP_id, cocktails: createdUser.cocktails },
      });
    } else {
      req.session.message = 'This username/id is already taken. Please try again.';
      // console.log(req.session.message);
      res.json({
        status: 404,
        loggedIn: false,
        data: null,
      });
    }
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

// LOGIN POST route
router.post('/login', showMessagesAndUsername, async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  geoData.ip = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (geoData.ip) {
    geoData = await getClientLocationFromIP();
  }
  if (geoData.ip === '::1') {
    geoData.ip = '63.149.97.94';
    geoData.city = 'Denver';
    geoData.district = 'CO';
    geoData.country_code = 'US';
    geoData.postal_code = '80205';
  }
  // console.log(`LOGIN user route hit: ${geoData.ip}, ${geoData.city}, ${geoData.district}, ${geoData.postal_code}`);

  try {
    const foundUser = await User.findOne({ sP_id: req.body.id }).populate('cocktails');
    if (foundUser) {
      req.session.message = '';
      req.session.logged = true;
      req.session.sP_id = req.body.id;
      req.session.userDbId = foundUser._id;
      // console.log(req.session, 'successful login');
      res.json({
        status: 200,
        loggedIn: true,
        data: { _id: foundUser._id, sP_id: foundUser.sP_id, cocktails: foundUser.cocktails },
      });
    } else {
      req.session.message = 'User not found in backend. Please try again.';
      // console.log(req.session.message);
      res.json({
        status: 404,
        loggedIn: false,
        data: null,
      });
    }
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

// LOGOUT route
router.get('/logout', (req, res) => {
  // console.log('LOGOUT user route hit');

  req.session.destroy((err) => {
    if (err) {
      res.json({
        status: 500,
        data: err,
      });
    } else {
      res.json({
        status: 200,
        loggedIn: false,
        data: true,
      });
    }
  });
});

// FIND route
router.post('/find', requireLogin, async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  geoData.ip = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (geoData.ip) {
    geoData = await getClientLocationFromIP();
  }
  if (geoData.ip === '::1') {
    geoData.ip = '63.149.97.94';
    geoData.city = 'Denver';
    geoData.district = 'CO';
    geoData.country_code = 'USs';
    geoData.postal_code = '80205';
  }
  // console.log(`FIND user route hit: ${geoData.ip}, ${geoData.city}, ${geoData.district}, ${geoData.postal_code}`);

  try {
    const foundUser = await User.find({ sP_id: req.body }).populate('cocktails');
    res.json({
      status: 200,
      data: { _id: foundUser._id, sP_id: foundUser.sP_id, cocktails: foundUser.cocktails },
    });
  } catch (err) {
    res.json({
      status: 500,
      data: err,
    });
  }
});

module.exports = router;
