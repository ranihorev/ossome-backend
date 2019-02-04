const express = require('express');
const router = express.Router();
const Post = require('../../models/Posts');
const passport = require("passport");

const newPostRouter = require('./newPost');
const postUtils = require('./postUtils');

router.all('/*', passport.authenticate('jwt'));

router.use('/', newPostRouter);

router.get('/', async function(req, res) {
  await fetch_posts(req, res);
});

router.delete('/post/:postId', async function(req, res) {
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

async function fetch_posts(req, res) {
  const q = postUtils.normalizeQuery(req.query);
  const posts = await Post.find(q).sort({date_published: -1}).limit(20);
  posts.forEach((p) => {
    p.images = postUtils.getSignedImages(p.images);
  });
  res.send({posts: posts});
}


module.exports = router;