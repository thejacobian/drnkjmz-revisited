/* eslint-disable prefer-template */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const User = require('../models/user');
// const Cocktail = require('../models/cocktail');

// require login middleware
const requireLogin = require('../middleware/requireLogin');
const showMessagesAndUsername = require('../middleware/showSessionMessages');

// INDEX route
router.get('/', requireLogin, async (req, res) => {
  try {
    const thisUsersDbId = req.session.usersDbId;
    const users = await User.find({});
    res.render('users/index.ejs', {
      users,
      currentUser: thisUsersDbId,
    });
  } catch (err) {
    res.send(err);
  }
});

// SHOW route
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const thisUsersDbId = req.session.usersDbId;
    if (req.params.id === thisUsersDbId) {
      const thisUsersDbId = req.session.usersDbId;
      const foundUser = await User.findById(req.params.id).populate({ path: 'cocktails' });
      // , populate: { path: 'cocktails' } });
      // const allCocktails = await Cocktail.find({});
      res.render('users/show.ejs', {
        user: foundUser,
        currentUser: thisUsersDbId,
        // allCocktails,
      });
    } else {
      req.session.message = 'You do not have access to this user';
      console.log(req.session.message);
      res.send(req.session.message);
    }
  } catch (err) {
    res.send(err);
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
router.put('/:id', requireLogin, async (req, res) => {
  try {
    const thisUsersDbId = req.session.usersDbId;
    if (req.params.id === thisUsersDbId) {
      req.body.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
      const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.redirect('/auth/login');
    } else {
      req.session.message = 'You do not have access to this user';
      console.log(req.session.message);
      res.send(req.session.message);
    }
  } catch (err) {
    res.send(err);
  }
});

// DELETE route
router.delete('/:id', requireLogin, async (req, res) => {
  try {
    const thisUsersDbId = req.session.usersDbId;
    if (req.params.id === thisUsersDbId) {
      const deletedUser = await User.findByIdAndRemove(req.params.id);
      console.log(deletedUser);
    } else {
      req.session.message = 'You do not have access to this user';
      console.log(req.session.message);
      res.send(req.session.message);
    }
  } catch (err) {
    res.send(err);
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
    const foundUser = await User.findOne({ username: req.body.username });
    if (!foundUser) {
      const { password } = req.body;
      const passwordHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      const userDbEntry = {};
      userDbEntry.username = req.body.username;
      userDbEntry.password = passwordHash;
      const createdUser = await User.create(userDbEntry);
      req.session.logged = true;
      req.session.usersDbId = createdUser._id;
      res.redirect('/dreams');
    } else {
      req.session.message = 'This username is already taken. Please choose again.';
      console.log(req.session.message);
      const thisUsersDbId = req.session.usersDbId;
      res.render('auth/register.ejs', {
        currentUser: thisUsersDbId,
        message: req.session.message,
      });
    }
  } catch (err) {
    res.send(err);
  }
});

// helper function for login to show session messages
const renderLoginPage = async (req, res) => {
  const thisUsersDbId = req.session.usersDbId;
  // const allCocktails = await Cocktail.find({}).sort([['count', -1]]);
  res.render('auth/login.ejs', {
    currentUser: thisUsersDbId,
    // cocktails: allCocktails,
    message: req.session.message,
  });
};

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
  try {
    const foundUser = await User.findOne({ username: req.body.username });
    if (foundUser) {
      if (bcrypt.compareSync(req.body.password, foundUser.password) === true) {
        console.log(req.body.password);
        req.session.message = '';
        req.session.logged = true;
        req.session.username = req.body.username;
        req.session.usersDbId = foundUser._id;
        console.log(req.session, 'successful login');
        res.redirect('/dreams');
      } else {
        req.session.message = 'Incorrect username or password. Please try again.';
        console.log(req.session.message);
        renderLoginPage(req, res);
      }
    } else {
      req.session.message = 'Incorrect username or password. Please try again.';
      console.log(req.session.message);
      renderLoginPage(req, res);
    }
  } catch (err) {
    res.send(err);
  }
});

// LOGOUT route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.send(err);
    } else {
      res.redirect('/auth/login');
    }
  });
});

module.exports = router;
