// require express packages
const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

// require dotenv for environment variables
require('dotenv').config();

// set up cors
app.use(cors({
  origin: process.env.FRONTEND_ADDRESS,
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Use 'path' for Big Repo deployment
app.use(express.static(path.join(__dirname, 'client/build')));

// require mongo db connection
require('./db/db');

// set up middleware
app.use(bodyParser.json());

// set up express-session
app.use(session({
  saveUninitialized: true,
  secret: process.env.SECRET,
  resave: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
  },
}));

// require the controllers
const userController = require('./controllers/userController');
const cocktailController = require('./controllers/cocktailController');

// use the controllers
app.use('/api/v1/users', userController);
app.use('/api/v1/cocktails', cocktailController);


// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(`${__dirname}/client/build/index.html`));
});

app.listen(process.env.PORT || 27018, () => {
  console.log(`Listening on port: ${process.env.PORT}`);
});
