const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Post = new Schema({
  date_published: { type: Date, default: Date.now },
  date_edited: { type: Date, default: Date.now },
  user: {
    _id: {type: Schema.Types.ObjectId, ref: 'User'},
    name: {type: String, maxlength: 255},
    },
  post_type: {type: String, maxlength: 255, required: true},
  location: {
    x: Number, y: Number
  },
  content: {type: mongoose.Mixed, required: true}

});


module.exports = mongoose.model('Post', Post);


