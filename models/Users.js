const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
  "first_name": {type: String, maxlength: 255},
  "last_name": {type: String, maxlength: 255}
});

UserSchema.plugin(passportLocalMongoose, {usernameField: 'email', usernameLowerCase: true});

module.exports = mongoose.model('User', UserSchema);

