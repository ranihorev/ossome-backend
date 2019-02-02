const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const helmet = require('helmet')

const passport = require('passport')
const passportJWT = require("passport-jwt");
const aws = require('aws-sdk');

// requires the model with Passport-Local Mongoose plugged in
const User = require('./models/Users');


const cors = require("cors");

var app = express();

console.log('Starting server');

require('dotenv').config({path: `.env.${app.get('env')}`});

aws.config.update({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: process.env.AWS_REGION
});

const postsRouter = require('./routes/v1/posts');
const usersRouter = require('./routes/v1/users');

app.use(logger('dev'));

mongoose.connect(`mongodb://${process.env.MONGODB_PATH}`, { useNewUrlParser: true });

app.use(cors()); // TODO look into it

app.use(express.json());
app.use(helmet())
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Configure passport middleware
app.use(passport.initialize());
// app.use(passport.session());

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

const JWTStrategy   = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey   : process.env.SECRET_KEY
  },
  function (jwtPayload, cb) {

    //find the user in db if needed. This functionality may be omitted if you store everything you'll need in JWT payload.
    return User.findById(jwtPayload.id)
      .then(user => {
        return cb(null, user);
      })
      .catch(err => {
        return cb(err);
      });
  }
));



// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// app.use('/', postsRouter);
app.use('/v1/posts', postsRouter);
app.use('/v1/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});

module.exports = app;

console.log('Finished loading server');