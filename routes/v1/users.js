const express = require('express');
const router = express.Router();
const User = require('../../models/Users');
const passport = require('passport');
const isLoggedIn = require('../../middlewares/auth')
const jwt = require("jsonwebtoken");
const Joi = require('joi');

const base_user_schema = Joi.object().keys({
  email: Joi.string().email({ minDomainAtoms: 2 }).required(),
  password: Joi.string().min(4).required(),
});

const signup_schema = base_user_schema.keys({
  first_name: Joi.string().required(),
  last_name: Joi.string().required()
})


router.get('/', isLoggedIn, function(req, res) {
  res.send({user: req.user});
});


router.post('/register', async function(req, res, next) {
  const {error} = Joi.validate(req.body, signup_schema);
  if (error) {
    return res.status(400).json({
      message: error.details[0].message
    });
  }
  const user = new User({email: req.body.email, first_name: req.body.first_name, last_name: req.body.last_name});
  try {
    await User.register(user, req.body.password);
  } catch (err) {
    res.status(500).send({message: 'Failed to register user', details: err.message});
    return;
  }
  req.login(user, {session: false}, function (err) {
    if ( ! err ){
      console.log('user registered!');
      const token = jwt.sign({ id: user.id, email: user.email}, process.env.SECRET_KEY);
      return res.json({email: user.email, first_name:user.first_name, last_name: user.last_name, token});
    } else {
      res.status(500).send({message: 'Failed to login', details: err.message});
    }
  });

});

router.post('/login', function(req, res) {
  const {error} = Joi.validate(req.body, base_user_schema);
  if (error) {
    return res.status(400).json({
      message: error.details[0].message
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