const express = require('express');
const router = express.Router();
const Post = require('../../models/Posts');
const User = require('../../models/Users');
const isLoggedIn = require('../../middlewares/auth')

router.get('/', isLoggedIn, async function(req, res) {
  const posts = await Post.find().sort('-date');
  res.send({posts: posts, user: req.user});
});

router.post('/', isLoggedIn, async function(req, res) {
  const user = await User.findById(req.user._id);
  // TODO add validations
  let post = new Post({
      user: {
        _id: user._id,
        name: user.firstName,
      },
      post_type: req.body.post_type,
      location: {
        x: req.body.x, y: req.body.y
      },
      content: req.body.content
    });
  const output = await post.save();
  res.send({message: 'success'});
})


module.exports = router;