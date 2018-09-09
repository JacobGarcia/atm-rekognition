const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
  face: { type: Array, required: true },
  telephone: { type: String, unique: true, required: true },
  atm: { type: String },
  timestamp: { type: Number, default: Date.now },
  receipts: [
    {
      institute: String,
      transaction: String,
      account: String,
      ammount: Number,
      timestamp: { type: Number, default: Date.now },
      uri: String,
      folio: Number,
    },
  ],
  code: Number,
  photo: String,
})

schema.index({ face: 'text' })

module.exports = mongoose.model('User', schema)
