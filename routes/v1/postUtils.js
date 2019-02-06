const aws = require('aws-sdk');
const logger = require('../../logger')(__filename);
const SpotifyWebApi = require('spotify-web-api-node');

const s3 = new aws.S3();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_ID,
  clientSecret: process.env.SPOTIFY_SECRET,
});

module.exports.normalizeQuery = function(params) {
  let outParams = {};
  if ('user' in params) {
    outParams['user._id'] = params['user']
  }
  return outParams
}

module.exports.getSignedImages = function(images) {
  return images.map((im) => s3.getSignedUrl('getObject', {Bucket: process.env.S3_BUCKET, Key: im, Expires: 60*60*24*7}));
}

function fetchSpotifyToken() {
  spotifyApi.clientCredentialsGrant().then(
    function(data) {
      spotifyApi.setAccessToken(data.body['access_token']);
    },
    function(err) {
      logger.log('error', 'Failed to fetch Spotify token: ', err);
    }
  );
  setTimeout(fetchSpotifyToken, 1800*1000)
}

fetchSpotifyToken();

module.exports.s3 = s3;
module.exports.spotifyApi = spotifyApi;