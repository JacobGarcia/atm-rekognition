/* eslint-env node */
const path = require('path')
const express = require('express')
const winston = require('winston')
const router = new express.Router()
const jwt = require('jsonwebtoken')

const User = require(path.resolve('models/User'))

const config = require(path.resolve('config'))

router.route('/users/sms/verifcation/authorize').post((req, res) => {
  // Validate that no field is empty
  const { telephone, code } = req.body

  // Check if code matches
  User.findOne({ telephone }).exec((error, user) => {
    if (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: 'Error while looking updating user',
      })
    }
    const token = jwt.sign(
      {
        _id: user._id,
        telephone: user.telephone,
      },
      config.secret
    )
    if (parseInt(user.code, 10) === parseInt(code, 10)) return res
        .status(200)
        .json({ success: true, message: 'Access given successfully', token })
    return res
      .status(401)
      .json({ success: false, message: 'Wrong access code' })
  })
})

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

router.use((req, res, next) => {
  const bearer = req.headers.authorization || 'Bearer '
  const token = bearer.split(' ')[1]

  if (!token) {
    return res
      .status(401)
      .send({ error: { message: 'No bearer token provided' } })
  }

  return jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      winston.error('Failed to authenticate token', err, token)
      return res
        .status(401)
        .json({ error: { message: 'Failed to authenticate  bearer token' } })
    }

    req._user = decoded
    req._token = token
    return next()
  })
})

module.exports = router
