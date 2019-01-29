const express = require('express');
const router = express.Router();
const User = require('../../models/Users');
const passport = require('passport');
const isLoggedIn = require('../../middlewares/auth')
const jwt = require("jsonwebtoken");

router.get('/', isLoggedIn, function(req, res) {
  res.send({user: req.user});
});


router.post('/register', async function(req, res, next) {
  console.log('registering user');
  const user = new User({email: req.body.email, first_name: req.body.first_name, last_name: req.body.last_name});
  try {
    await User.register(user, req.body.password);
  } catch (err) {
    res.status(500).send({message: 'Failed to register user', details: err});
    return;
  }
  req.login(user, {session: false}, function (err) {
    if ( ! err ){
      console.log('user registered!');
      const token = jwt.sign({ id: user.id, email: user.email}, process.env.SECRET_KEY);
      return res.json({email: user.email, first_name:user.first_name, last_name: user.last_name, token});
    } else {
      res.status(500).send({message: 'Failed to login', details: err});
    }
  });

});

router.post('/login', function(req, res) {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      message: 'Something is not right with your input'
    });
  }
  passport.authenticate('local', {session: false}, (err, user, info) => {
    if (err || !user) {
      return res.status(400).json({
        message: info.message || 'Something is not right',
      });
    };
    const token = jwt.sign({ id: user.id, email: user.email}, process.env.SECRET_KEY);
    return res.json({email: user.email, first_name:user.first_name, last_name: user.last_name, token});
  })(req, res);
});

module.exports = router;