const express = require('express');
const router = express.Router();
const Post = require('../../models/Posts');
const Image = require('../../models/Images');
const User = require('../../models/Users');
const passport = require("passport");
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const randomstring = require("randomstring");
const path = require('path');
const mongoose = require('mongoose');
const os = require("os");


const generate_name = (file) => {
  const name = randomstring.generate({length: 16, charset: 'alphabetic'});
  const ext = path.extname(file.originalname);
  return name + ext
}

const storage_local = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, generate_name(file))
  },
});
const s3 = new aws.S3();

const storage_s3 = multerS3({
  s3: s3,
  bucket: process.env.S3_BUCKET,
  metadata: function (req, file, cb) {
    cb(null, {fieldName: file.fieldname});
  },
  key: function (req, file, cb) {
    const d = new Date();
    cb(null, `${d.getFullYear()}/${d.getMonth() + 1}/${generate_name(file)}`)
  }
})

const image_filter = function (req, file, callback) {
  const ext = path.extname(file.originalname);
  if(ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
    return callback(new Error('Only images are allowed'))
  }
  callback(null, true)
};

const upload = multer({ storage: storage_s3, fileFilter: image_filter });

const googleMapsClient = require('@google/maps').createClient({
  key: process.env.GOOGLE_KEY,
  Promise: Promise
});

function get_signed_images(images) {
  return images.map((im) => s3.getSignedUrl('getObject', {Bucket: process.env.S3_BUCKET, Key: im, Expires: 60*60*24*7}));
}

router.get('/', passport.authenticate('jwt'), async function(req, res) {
  const posts = await Post.find().sort({date_published: -1}).limit(20);
  // const hostname = req.headers.host; (im) => `${hostname}/${im}`
  posts.forEach((p) => {
    p.images = get_signed_images(p.images);
  });
  res.send({posts: posts});
});

router.post('/post/', [passport.authenticate('jwt'), upload.array('images', 3)], async function(req, res) {
  const user = await User.findById(req.user._id);
  const content = JSON.parse(req.body.content);
  const {location, text} = content;
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
    images: req.files.map((f) => f.key),
    raw_content: content,
    version: 'v1'
  });
  await post.save();
  post.images = get_signed_images(post.images);
  res.send({message: 'success', post: post});
});

router.post('/post/image', [passport.authenticate('jwt'), upload.array('images', 3)],  async function(req, res) {
  const images_data = req.files.map((f) => { return {key: f.path, user_id: req.user._id}});
  const images = await Image.insertMany(images_data);
  res.send(images.map((f) => f._id));
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