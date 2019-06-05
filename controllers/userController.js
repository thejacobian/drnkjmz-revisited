/* eslint-disable prefer-template */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

const router = express.Router();
const User = require('../models/user');
// const Cocktail = require('../models/cocktail');

// require login middleware
const requireLogin = require('../middleware/requireLogin');
const showMessagesAndUsername = require('../middleware/showSessionMessages');

let ipAddress = '';
let city = '';
let state = '';
let countryCode = '';

// adapted from Stack Overflow for basic geolocation detection
const getClientLocationFromIP = async () => {
  try {
    const request = `https://json.geoiplookup.io/${ipAddress}`;
    const result = await fetch(request);
    const parsedResult = await result.json();
    console.log(parsedResult);
    return parsedResult;
  } catch (err) {
    console.log(`${err} in the geoiplookup.io ext API call`);
    return null;
  }
};

// INDEX route
router.get('/', /*requireLogin,*/ async (req, res) => {
  try {

    // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
    ipAddress = req.headers['x-forwarded-for']
      || req.connection.remoteAddress
      || req.socket.remoteAddress
      || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    if (ipAddress === '::1') {
      ipAddress = '63.149.97.94';
      city = 'Denver';
      state = 'CO';
      countryCode = 'US';
    } else {
      getClientLocationFromIP();
    }

    console.log(`INDEX route hit: ${ipAddress}, ${city}, ${state}, ${countryCode}`);
    res.send(`INDEX route hit: ${ipAddress}, ${city}, ${state}, ${countryCode}`);
    
    const thisUsersDbId = req.session.usersDbId;
    const users = await User.find({});
    res.json({
      status: 200,
      users: users,
      currentUser: thisUsersDbId
    });
  } catch (err) {
    res.json(err);
  }
});

// SHOW route
router.get('/:id', /*requireLogin,*/ async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  ipAddress = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (ipAddress) {
    getClientLocationFromIP();
  }

  try {
    const thisUsersDbId = req.session.usersDbId;
    // if (req.params.id === thisUsersDbId) {
      const foundUser = await User.findById(req.params.id).populate('cocktails');
      // , populate: { path: 'cocktails' } });
      // const allCocktails = await Cocktail.find({});
      res.json({
        status: 200,
        user: foundUser,
        currentUser: thisUsersDbId,
      });
    // } else {
    //   req.session.message = 'You do not have access to this user';
    //   console.log(req.session.message);
    //   res.json({
    //     status: 500,
    //     user: null,
    //     currentUser: thisUsersDbId,
    //   });
    // }
  } catch (err) {
    res.json(err);
  }
});

// // EDIT route
// router.get('/:id/edit', requireLogin, async (req, res) => {
//   try {
//     const thisUsersDbId = req.session.usersDbId;
//     if (req.params.id === thisUsersDbId) {
//       const foundUser = await User.findById(req.params.id);
//       res.render('users/edit.ejs', {
//         user: foundUser,
//         currentUser: thisUsersDbId,
//       });
//     } else {
//       req.session.message = 'You do not have access to this user';
//       console.log(req.session.message);
//       res.send(req.session.message);
//     }
//   } catch (err) {
//     res.send(err);
//   }
// });

// UPDATE route
router.put('/:id', /*requireLogin,*/ async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  ipAddress = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (ipAddress) {
    getClientLocationFromIP();
  }

  try {
    // const thisUsersDbId = req.session.usersDbId;
    // if (req.params.id === thisUsersDbId) {
      // req.body.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
      const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({
        status: 200,
        user: updatedUser
      });
    // } else {
    //   req.session.message = 'You do not have access to this user';
    //   console.log(req.session.message);
    //   res.send(req.session.message);
    //   res.json({
    //     status: 500,
    //     user: null,
    //   })
    // }
  } catch (err) {
    res.json(err);
  }
});

// DELETE route
router.delete('/:id', /*requireLogin,*/ async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  ipAddress = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (ipAddress) {
    getClientLocationFromIP();
  }

  try {
    // const thisUsersDbId = req.session.usersDbId;
    // if (req.params.id === thisUsersDbId) {
      const deletedUser = await User.findByIdAndRemove(req.params.id);
      console.log(deletedUser);
      res.json({
        status: 200,
        deleted: true,
        user: deletedUser,
      });
    // } else {
    //   req.session.message = 'You do not have access to this user';
    //   console.log(req.session.message);
    //   res.json({
    //     status: 500,
    //     deleted: false,
    //     user: null,
    //   })
    // }
  } catch (err) {
    res.json(err);
  }
});

// // NEW/REGISTER route
// router.get('/register', showMessagesAndUsername, (req, res) => {
//   const thisUsersDbId = req.session.usersDbId;
//   res.render('auth/register.ejs', {
//     currentUser: thisUsersDbId,
//     message: req.session.message,
//   });
// });

// CREATE/REGISTER route
router.post('/register', showMessagesAndUsername, async (req, res) => {
  try {
    // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
    let geoData;
    ipAddress = req.headers['x-forwarded-for']
      || req.connection.remoteAddress
      || req.socket.remoteAddress
      || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    if (ipAddress) {
      geoData = await getClientLocationFromIP();
    }
    if (ipAddress === '::1') {
      geoData.ip = '63.149.97.94';
      geoData.city = 'Denver';
      geoData.district = 'CO';
      geoData.postal_code = '80205';
    }

    const foundUser = await User.findOne({ sP_id: req.body.sP_id });
    if (!foundUser) {
      // const { password } = req.body;
      // const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      // userDbEntry.password = passwordHash;
      const dbUser = req.body;
      if (geoData) {
        dbUser.ip = geoData.ip;
        dbUser.city = geoData.city;
        dbUser.state = geoData.district;
        dbUser.postal_code = geoData.postal_code;
      }

      const createdUser = await User.create(dbUser);
      req.session.logged = true;
      req.session.usersDbId = createdUser._id;
      res.json({
        status: 200,
        loggedIn: true,
        user: createdUser,
      });
    } else {
      req.session.message = 'This username/id is already taken. Please try again.';
      console.log(req.session.message);
      res.json({
        status: 500,
        loggedIn: false,
        user: null,
      });
    }
  } catch (err) {
    res.json(err);
  }
});

// // helper function for login to show session messages
// const renderLoginPage = async (req, res) => {
//   const thisUsersDbId = req.session.usersDbId;
//   // const allCocktails = await Cocktail.find({}).sort([['count', -1]]);
//   res.render('auth/login.ejs', {
//     currentUser: thisUsersDbId,
//     // cocktails: allCocktails,
//     message: req.session.message,
//   });
// };

// // LOGIN GET route
// router.get('/login', showMessagesAndUsername, async (req, res) => {
//   try {
//     renderLoginPage(req, res);
//   } catch (err) {
//     res.send(err);
//   }
// });

// LOGIN POST route
router.post('/login', showMessagesAndUsername, async (req, res) => {
  // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
  ipAddress = req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null);
  if (ipAddress) {
    getClientLocationFromIP();
  }

  try {
    const foundUser = await User.findOne({ sP_id: req.body.id });
    if (foundUser) {
      // if (bcrypt.compareSync(req.body.password, foundUser.password) === true) {
        // console.log(req.body.password);
        req.session.message = '';
        req.session.logged = true;
        req.session.sP_id = req.body.id;
        req.session.usersDbId = foundUser._id;
        console.log(req.session, 'successful login');
        res.json({
          status: 200,
          loggedIn: true,
          user: foundUser,
        });
      // } else {
      //   req.session.message = 'Incorrect username or password. Please try again.';
      //   console.log(req.session.message);
      //   res.json({
      //     status: 500,
      //     user: null,
      //     loggedIn: false
      //   });
      // }
    } else {
      req.session.message = 'Incorrect credentials. Please log in to Spotify again.';
      console.log(req.session.message);
      res.json({
        status: 500,
        loggedIn: false,
        user: null,
      });
    }
  } catch (err) {
    res.json(err);
  }
});

// LOGOUT route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.json(err);
    } else {
      res.json({
        status: 200,
        loggedIn: false,
      });
    }
  });
});

// FIND route
router.post('/find', /*requireLogin,*/ async (req, res) => {
  try {

    // get the User's IP address from the HTTP request X-Forwarded-For header (from Stack Overflow)
    ipAddress = req.headers['x-forwarded-for']
      || req.connection.remoteAddress
      || req.socket.remoteAddress
      || (req.connection.socket ? req.connection.socket.remoteAddress : null);
    if (ipAddress === '::1') {
      ipAddress = '63.149.97.94';
      city = 'Denver';
      state = 'CO';
      countryCode = 'US';
    } else {
      getClientLocationFromIP();
    }

    console.log(`INDEX route hit: ${ipAddress}, ${city}, ${state}, ${countryCode}`);

    // const thisUsersDbId = req.session.usersDbId;
    const foundUser = await User.find({ sP_id: req.body });
    res.json({
      status: 200,
      user: foundUser,
    });
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;
