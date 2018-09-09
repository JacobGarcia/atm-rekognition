const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema({
  timestamp: { type: Number, default: Date.now },
  success: Boolean,
  atm: String,
  face: Array,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  status: Number,
})

module.exports = mongoose.model('Access', schema)
