const express = require('express');
const router = express.Router();
const _ = require('lodash/core');
const Post = require('../../models/Posts');
const User = require('../../models/Users');
const randomstring = require("randomstring");
const sgMail = require('@sendgrid/mail');
const logger = require('../../logger')(__filename);

if (!_.isEmpty(process.env.SENDGRID_API_KEY))
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function notify(post, comment) {
  if (_.isEmpty(process.env.SENDGRID_API_KEY)) {
    logger.log('info', 'No Sendgrid API key');
    return;
  }
  if (post.user._id === comment.user._id) {
    logger.log('info', 'Self comment, skipping');
    return;
  }

  User.findById(post.user._id, function (err, user) {
    if (err) {
      logger.log('error', 'Failed to find user');
      return;
    }
    const msg = {
      to: user.email,
      from: `Ossome <noreply@snip.today>`,
      subject: `${comment.user.first_name} replied to your post`,
      text: `${comment.user.first_name} replied to your post`,
      html: `<p>Hey ${user.first_name},</p><div>${comment.user.first_name} replied to your post:</div>
<div><i>${comment.text}</i></div><p>Click <a href="${process.env.BASE_URL}/post/${post._id}" target="_blank">here</a> to reply.</p>`,
    };
    sgMail.send(msg)
      .then(() => {
        logger.log('info', 'Email was sent successfully!');
      })
      .catch(error => {
        logger.log('error', 'Failed to send email due to: ' + error);
      });
  });
}

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
    notify(post, newComment);
    return res.send({post: req.body.post, comment: newComment});
  } catch (e) {
    return res.status(404).send({message: 'Post not found'});
  }
});

module.exports = router;