const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Image = new Schema({
  date: { type: Date, default: function(){return new Date().getTime()} },
  user_id: {type: Schema.Types.ObjectId, ref: 'User'},
  key: {type: String, maxlength: 100},
});


module.exports = mongoose.model('Image', Image);


