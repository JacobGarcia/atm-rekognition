const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
  face: { type: [Object], required: true },
  telephone: { type: Number, unique: true, required: true },
  atm: { type: String },
  timestamp: { type: Number, default: Date.now },
})

schema.index({ face: 'text' })

module.exports = mongoose.model('User', schema)
