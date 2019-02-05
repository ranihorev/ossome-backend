const express = require('express');
const router = express.Router();
const _ = require('lodash/core');
const Post = require('../../models/Posts');
const randomstring = require("randomstring");

router.post('/new_comment/', async function(req, res) {
  if (_.isEmpty(req.body.content) || _.isEmpty(req.body.content.text))
    return res.status(400).send({message: 'Content is missing'});

  try {
    const post = await Post.findById(req.body.post);
    const newComment = {
      id: randomstring.generate({length: 16, charset: 'alphabetic'}),
      text: req.body.content.text,
      user: {
        _id: req.user._id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
      },
    }
    post.comments.push(newComment);
    await post.save();
    return res.send({post: req.body.post, comment: newComment});
  } catch (e) {
    return res.status(404).send({message: 'Post not found'});
  }
});

module.exports = router;