const mustBeLoggedIn = (req, res, next) => {
  if (!req.session.logged) {
    req.session.message = 'Please log in';
    res.redirect('/');
  } else {
    next();
  }
};

module.exports = mustBeLoggedIn;
