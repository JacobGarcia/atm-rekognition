const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
  photo: { type: String, default: null }, // Url
  telephone: { type: Number, unique: true, required: true },
  atm: { type: String },
  timestamp: { type: Number, default: Date.now },
})

schema.index({ telephone: 'text' })

module.exports = mongoose.model('User', schema)
