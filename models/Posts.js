const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Post = new Schema({
  date_published: { type: Date, default: function(){return new Date().getTime()} },
  date_edited: { type: Date, default: function(){return new Date().getTime()} },
  user: {
    _id: {type: Schema.Types.ObjectId, ref: 'User'},
    first_name: {type: String, maxlength: 255},
    last_name: {type: String, maxlength: 255},
    },
  post_type: {type: String, maxlength: 50, required: true},
  location: {
    text:{type: String, maxlength: 500},
    id:{type: String, maxlength: 50},
    rating:{type: Number, min: 0, max: 5}
  },
  movie: {
    text:{type: String, maxlength: 500},
    id:{type: String, maxlength: 50},
    type:{type: String, maxlength: 50},
    rating:{type: Number, min: 0, max: 5}
  },
  images: {type: [{type: String}]},
  text: {type: String},
  raw_content: {type: mongoose.Mixed, required: true},
  version: {type: String, maxlength: 6, default: 'v1'}

});


module.exports = mongoose.model('Post', Post);


