const aws = require('aws-sdk');

const s3 = new aws.S3();

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

module.exports.s3 = s3;