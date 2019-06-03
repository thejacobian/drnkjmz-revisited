module.exports = (req, res, next) => {
  if (req.session.message) {
    res.locals.message = req.session.message;
    req.session.message = '';
  }
  if (req.session.logged) {
    res.locals.username = req.session.username;
    res.locals.logged = true;
  } else {
    res.locals.logged = false;
  }
  next();
};
