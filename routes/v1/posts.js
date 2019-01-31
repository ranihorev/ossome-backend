const express = require('express');
const router = express.Router();
const Post = require('../../models/Posts');
const User = require('../../models/Users');
const isLoggedIn = require('../../middlewares/auth')
const passport = require("passport");

const googleMapsClient = require('@google/maps').createClient({
  key: process.env.GOOGLE_KEY,
  Promise: Promise
});

router.get('/', passport.authenticate('jwt'), async function(req, res) {
  const posts = await Post.find().sort({date_published: -1});
  res.send({posts: posts});
});

router.post('/', passport.authenticate('jwt'), async function(req, res) {
  const user = await User.findById(req.user._id);
  const {location, text} = req.body.content;
  // TODO add validations
  let post = new Post({
    user: {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
    },
    post_type: req.body.post_type,
    location: {
      id: location.id,
      text: location.text,
    },
    text: text,
    raw_content: req.body.content
  });
  await post.save();
  res.send({message: 'success', post: post});
});

router.delete('/post/:postId', passport.authenticate('jwt'), async function(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (req.user._id.toString() !== post.user._id.toString())
      return res.status(401).send({message: 'Unauthorized to delete post'});
    try {
      await post.remove();
    } catch (e) {
      return res.status(500).send({message: 'Internal Error'})
    }
    res.send({message: 'Post was deleted'});
  } catch (e) {
    return res.status(404).send({message: 'Post not found'});
  }
});

function getTimeStamp() {
  const today = new Date();
  const round_today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours(), 0, 0);
  return round_today / 1000;
}

router.get('/autocomplete_places/', passport.authenticate('jwt'), function(req, res) {
  const loc = req.query.location;
  console.log(`${req.user._id.toString()}_${getTimeStamp()}`);
  if (!loc || loc.length <= 1) return res.send([]);
  googleMapsClient.placesAutoComplete({input: loc, sessiontoken: `${req.user._id.toString()}_${getTimeStamp()}`}).asPromise()
    .then((response) => {
      res.send(response.json.predictions.map((loc) => {return {id: loc.place_id, text: loc.description}}));
    }).catch((err) => {
    res.status(500).json({message: 'Failed to fetch autocomplete options'});
  })
});

module.exports = router;