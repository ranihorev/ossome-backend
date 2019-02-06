const express = require('express');
const router = express.Router();
const Post = require('../../models/Posts');
const multer = require('multer');
const multerS3 = require('multer-s3');
const randomstring = require("randomstring");
const path = require('path');
const axios = require('axios');
const _ = require('lodash/core');
const logger = require('../../logger')(__filename);

const postUtils = require('./postUtils');

const TMDB_IM_PATH = `https://image.tmdb.org/t/p/w92`;
const TMDB_PATH = 'https://www.themoviedb.org';
const GOOGLE_MAPS_PATH = 'https://www.google.com/maps/search/?q=place_id:';

const generate_name = (file) => {
  const name = randomstring.generate({length: 16, charset: 'alphabetic'});
  const ext = path.extname(file.originalname);
  return name + ext
};

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
});

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
  const content = JSON.parse(req.body.content);
  const {location, movie, text, music, food} = content;
  // TODO add validations
  let post = new Post({
    user: {
      _id: req.user._id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
    },
    post_type: req.body.post_type,
    location: location,
    movie: movie,
    music: music,
    food: food,
    text: text,
    images: req.files.map((f) => f.key),
    raw_content: content,
    version: 'v1'
  });
  try {
    await post.save();
  } catch (e) {
    logger.log('error', e);
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
  const q = req.query.q;
  if (!q || q.length <= 1) return res.send([]);
  let query = {input: q, sessiontoken: `${req.user._id.toString()}_${getTimeStamp()}`};
  if (req.query.establishment === "1") query.types = ['establishment'];

  googleMapsClient.placesAutoComplete(query).asPromise()
    .then((response) => {
      res.send(response.json.predictions.map((loc) => {
        return {id: loc.place_id, text: loc.description, url: GOOGLE_MAPS_PATH + loc.place_id}
      }));
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
        const url = `${TMDB_PATH}/${m.media_type}/${m.id}`;
        return {id: m.id, text: title, img: TMDB_IM_PATH + m.poster_path, type: m.media_type, url: url}
      }).slice(0,10);
    res.send(movies);
  })
});

function getArtists(artists) {
  return artists.map((art) => {
    return {name: art.name, url: art.external_urls && art.external_urls.spotify}
  });
}

router.get('/search_music/', async function(req, res) {
  let q = req.query.q;
  if (!q || q.length <= 3) return res.send([]);
  q += '*';
  postUtils.spotifyApi.search(q, ['album,track,artist'], {limit: 5}).then(spotifyRes => {
    const albums = spotifyRes.body.albums.items.map(item => {
      return {
        type: 'album',
        id: item.id,
        artist: getArtists(item.artists),
        text: item.name,
        url: item.external_urls && item.external_urls.spotify,
        img: !_.isEmpty(item.images) && item.images[item.images.length-1].url
      }
    });

    const artists = spotifyRes.body.artists.items.map(item => {
      return {
        type: 'artist',
        id: item.id,
        text: item.name,
        url: item.external_urls && item.external_urls.spotify,
        img: !_.isEmpty(item.images) && item.images[item.images.length-1].url
      }
    });

    const tracks = spotifyRes.body.tracks.items.map(item => {
      return {
        type: 'track',
        id: item.id,
        artist: getArtists(item.artists),
        text: item.name,
        url: item.external_urls && item.external_urls.spotify,
        img: !_.isEmpty(item.album) && !_.isEmpty(item.album.images) && item.album.images[item.album.images.length-1].url
      }
    });

    res.send(artists.concat(albums, tracks));
  }).catch(err => {
    res.send([])
  })
});

module.exports = router;