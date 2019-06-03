/* eslint-disable no-path-concat */
/* eslint-disable prefer-template */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
// require express packages
const express = require('express');

const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
// const session = require('express-session');
const morgan = require('morgan');
// const MongoDBStore = require('connect-mongodb-session')(session);
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

// // define mongo db store
// const store = new MongoDBStore({
//   uri: process.env.MONGODB_URI,
//   collection: 'mySessions'
// });

// // set up middleware
app.use(morgan('short'));
// app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// // set up express-session
// app.use(session({
//   saveUninitialized: true,
//   secret: process.env.SECRET,
//   resave: false,
//   store: store,
//   cookie: {
//     maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
//   },
// }));

// // debugging userId from session in console ***REMOVE FOR PROD***
// app.use((req, res, next)=>{
//   console.log(`Incoming request from UserId: ${req.session.userId}`)
//   next();
// });

// // require the controllers
// const userController = require('./controllers/userController');
const cocktailController = require('./controllers/cocktailController');
// const authController  = require('./controllers/authController');

// use the controllers
app.use('/api/v1/cocktails', cocktailController);
// app.use('/auth', authController);

// Handles any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/client/build/index.html'));
});

app.listen(process.env.PORT || 27018, () => {
  console.log(`Listening on port: ${process.env.PORT}`);
});
