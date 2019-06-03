const mustBeLoggedIn = (req, res, next) => {
  if (!req.session.logged) {
    req.session.message = 'Please log in';
    res.redirect('/auth/login');
  } else {
    next();
  }
};

module.exports = mustBeLoggedIn;
