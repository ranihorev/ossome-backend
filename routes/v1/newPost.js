const express = require('express');
const router = express.Router();
const Post = require('../../models/Posts');
const User = require('../../models/Users');
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const randomstring = require("randomstring");
const path = require('path');
const axios = require('axios');

const postUtils = require('./postUtils');

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

const storage_s3 = multerS3({
  s3: postUtils.s3,
  bucket: process.env.S3_BUCKET,
  metadata: function (req, file, cb) {
    cb(null, {fieldName: file.fieldname});
  },
  key: function (req, file, cb) {
    const d = new Date();
    cb(null, `${process.env.S3_BASE_PATH}/${d.getFullYear()}/${d.getMonth() + 1}/${generate_name(file)}`)
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


router.post('/post/', upload.array('images', 3), async function(req, res) {
  const user = await User.findById(req.user._id);
  const content = JSON.parse(req.body.content);
  const {location, movie, text} = content;
  // TODO add validations
  let post = new Post({
    user: {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
    },
    post_type: req.body.post_type,
    location: location,
    movie: movie,
    text: text,
    images: req.files.map((f) => f.key),
    raw_content: content,
    version: 'v1'
  });
  try {
    await post.save();
  } catch (e) {
    return res.status(500).send({message: 'Failed to save post'})
  }
  post.images = postUtils.getSignedImages(post.images);
  res.send({message: 'success', post: post});
});


function getTimeStamp() {
  const today = new Date();
  const round_today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours(), 0, 0);
  return round_today / 1000;
}

router.get('/autocomplete_places/', function(req, res) {
  const loc = req.query.q;
  console.log(`${req.user._id.toString()}_${getTimeStamp()}`);
  if (!loc || loc.length <= 1) return res.send([]);
  googleMapsClient.placesAutoComplete({input: loc, sessiontoken: `${req.user._id.toString()}_${getTimeStamp()}`}).asPromise()
    .then((response) => {
      res.send(response.json.predictions.map((loc) => {return {id: loc.place_id, text: loc.description}}));
    }).catch((err) => {
    res.status(500).json({message: 'Failed to fetch autocomplete options'});
  })
});

router.get('/search_movies/', function(req, res) {
  const q = req.query.q;
  if (!q || q.length <= 3) return res.send([]);
  axios.get('https://api.themoviedb.org/3/search/multi/', {params: {query: q, api_key: process.env.TMDB_KEY}}).then(data => {
    const movies = data.data.results
      .filter((m) => m.media_type !== 'person')
      .map((m) => {
        const title = (m.media_type === 'tv') ? m.name : m.title;
        return {id: m.id, text: title, img: m.poster_path, type: m.media_type}
      }).slice(0,10);
    res.send(movies);
  })
});

module.exports = router;