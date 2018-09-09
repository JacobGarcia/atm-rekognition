/* eslint-env node */
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

const express = require('express')
const router = new express.Router()
const multer = require('multer')
const mime = require('mime')
const jwt = require('jsonwebtoken')
const config = require(path.resolve('config'))

var AWS = require('aws-sdk')
// Set region
AWS.config.update({ region: 'us-east-1' })

const User = require(path.resolve('models/User'))
const Access = require(path.resolve('models/Access'))

// TODO: Refactor
const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, 'static/uploads'),
  filename: (req, file, callback) => {
    crypto.pseudoRandomBytes(16, (error, raw) => {
      callback(
        null,
        raw.toString('hex') +
          Date.now() +
          '.' +
          mime.getExtension(file.mimetype)
      )
    })
  },
})

const upload = multer({ storage }).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
])

// 1 to 1 (web app usage)
router.route('/users/recognize/one-to-one').post(upload, (req, res) => {
  const { photo } = req.files
  if (!photo) return res
      .status(400)
      .json({ success: false, message: 'Face not specified' })

  // call Alejin's service for facial recognition. Now using stub
  const response = {
    user: '507f1f77bcf86cd799439011',
    success: true,
    face: [[12, 32], [82, 21]],
    status: 200,
  }
  const access = {
    ...response,
  }
  // Insert access
  return new Access(access).save((error, access) => {
    if (error) {
      console.error(error)
      return res
        .status(500)
        .json({ success: false, message: 'Could not save access log.' })
    }
    return res.status(response.status).json({ access })
  })
})

// 1 to many (ask for which phone 'this' face has)
router.route('/users/recognize/one-to-many').post(upload, async (req, res) => {
  const { atm, institute, transaction, account, ammount, folio } = req.body
  const { photo, receipt } = req.files
  const s3 = new AWS.S3()

  if (!photo || !receipt) return res.status(400).json({
      success: false,
      message: 'Malformed Request. Face or receipt not specified',
    })

  // call Alejin's service for facial recognition. Now using stub
  // use PythonShell to call python instance ?
  const response = {
    user: '507f1f77bcf86cd799439011',
    success: true,
    face: [[12, 32], [82, 21]],
    status: 200,
    telephone: '+525581452376',
  }
  // Upload receipt to S3
  fs.readFile(receipt[0].path, (error, data) => {
    if (error) {
      console.error(error)
      return res
        .status(500)
        .json({ success: false, message: 'Could not read uploaded file' })
    }

    const base64data = Buffer.from(data, 'binary')

    return s3.putObject(
      {
        Bucket: 'nonbancomerclients',
        Key: response.telephone + '/' + receipt[0].filename,
        Body: base64data,
        ACL: 'public-read',
      },
      (error) => {
        if (error) {
          console.error(error)
          return res.status(500).json({
            success: false,
            message: 'Could not put object to S3 bucket.',
          })
        }
        return console.log('Successfully uploaded package.')
      }
    )
  })
  const access = {
    ...response,
    atm,
  }
  // Insert access
  try {
    await new Access(access).save()
    // Get S3 URL File
    const s3url = s3.getSignedUrl('getObject', {
      Bucket: 'nonbancomerclients',
      Key: response.telephone + '/' + receipt[0].filename,
    })

    // Create publish parameters
    // Create promise and SNS service object
    const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
      .publish({
        Message:
          institute +
          ' - ' +
          transaction +
          ' - CUENTA ' +
          account +
          ' - ' +
          'CANTIDAD $' +
          ammount +
          ' - COMPROBANTE OFICIAL ' +
          s3url /* required */,
        PhoneNumber: response.telephone,
      })
      .promise()

    // Handle promise's fulfilled/rejected states
    publishTextPromise
      .then((data) => {
        console.log('MessageID is ' + data.MessageId)
      })
      .catch((err) => {
        console.error(err, err.stack)
      })
    const receipt = {
      institute,
      transaction,
      account,
      ammount,
      uri: s3url,
      folio,
    }
    // Add receipt to User
    return User.findOneAndUpdate(
      { telephone: response.telephone },
      { $push: { receipts: receipt } }
    ).exec((error, updatedUser) => {
      if (error) {
        console.error(error)
        return res
          .status(500)
          .json({ success: false, message: 'Could not save update user' })
      }
      return res.status(response.status).json({ access, updatedUser })
    })
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ success: false, message: 'Could not save access log.' })
  }
})

// Register (stablish a relation between a face and a telephone)
router.route('/users/signup').post(upload, (req, res) => {
  // Validate that no field is empty
  const {
    telephone,
    atm,
    institute,
    transaction,
    account,
    ammount,
    folio,
  } = req.body
  const { photo, receipt } = req.files
  const s3 = new AWS.S3()

  if (!photo || !telephone || !atm || !receipt) return res
      .status(400)
      .json({ success: false, message: 'Malformed request' })
  // Upload receipt to S3
  fs.readFile(receipt[0].path, (error, data) => {
    if (error) {
      console.log(error)
    }

    const base64data = Buffer.from(data, 'binary')

    s3.putObject(
      {
        Bucket: 'nonbancomerclients',
        Key: telephone + '/' + receipt[0].filename,
        Body: base64data,
        ACL: 'public-read',
      },
      (error) => {
        if (error) {
          console.log(error)
        }
        console.log('Successfully uploaded package.')
      }
    )
  })
  // Check that the telephone is not already registered. TODO: Not just mark as an invalid request
  return User.findOne({ telephone }).exec((error, registeredUser) => {
    if (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: 'Error while looking for user',
      })
    }
    if (registeredUser) return res
        .status(409)
        .json({ success: false, message: 'User already registered' })

    // Call Python to register user
    const response = {
      face: [[12, 32], [82, 21]],
    }

    // Get S3 URL File
    const s3url = s3.getSignedUrl('getObject', {
      Bucket: 'nonbancomerclients',
      Key: telephone + '/' + receipt[0].filename,
    })

    const receipt = {
      institute,
      transaction,
      account,
      ammount,
      uri: s3url,
      folio,
    }
    const user = {
      ...response,
      telephone,
      atm,
      receipts: [receipt],
    }
    return new User(user).save((error, user) => {
      // Save the user form
      if (error) {
        console.error(error)
        return res.status(500).json({
          success: false,
          message: 'Error while saving user',
          error,
        })
      }
      console.log(user)

      // Create publish parameters
      // Create promise and SNS service object
      const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
        .publish({
          Message:
            institute +
            ' - ' +
            transaction +
            ' - CUENTA ' +
            account +
            ' - ' +
            'CANTIDAD $' +
            ammount +
            ' - COMPROBANTE OFICIAL ' +
            s3url /* required */,
          PhoneNumber: user.telephone,
        })
        .promise()

      // Handle promise's fulfilled/rejected states
      publishTextPromise
        .then((data) => {
          console.log('MessageID is ' + data.MessageId)
        })
        .catch((err) => {
          console.error(err, err.stack)
        })
      return res.status(200).json({ user })
    })
  })
})

router.route('/users/sms/verifcation/authorize').post((req, res) => {
  // Validate that no field is empty
  const { telephone, code } = req.body
  // Check if code matches
  User.findOne({ telephone: '+52' + telephone }).exec((error, user) => {
    if (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: 'Error while looking for user',
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

router.route('/users/sms/verifcation/send').post((req, res) => {
  // Validate that no field is empty
  const { telephone } = req.body

  //  Generate 4-digit code
  const code = Math.floor(Math.random() * 9000 + 1000)

  User.findOneAndUpdate(
    { telephone: '+52' + telephone },
    { $set: { code } }
  ).exec((error) => {
    const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
      .publish({
        Message: 'Tu código de acceso es ' + code /* required */,
        PhoneNumber: '+52' + telephone,
      })
      .promise()
    // Handle promise's fulfilled/rejected states
    publishTextPromise
      .then((data) => {
        console.log('MessageID is ' + data.MessageId)
      })
      .catch((err) => {
        console.error(err, err.stack)
      })
    if (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: 'Error while looking updating user',
      })
    }
    return res
      .status(200)
      .json({ success: true, message: 'Sent Verification Code' })
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
      console.error('Failed to authenticate token', err, token)
      return res
        .status(401)
        .json({ error: { message: 'Failed to authenticate  bearer token' } })
    }

    req._user = decoded
    req._token = token
    return next()
  })
})

router.route('/users/self').get((req, res) => {
  User.findById(req._user._id).exec((error, user) => {
    if (error) {
      console.error(error)
      return res.status(500).json({ error })
    }

    if (!user) return res.status(404).json({ error: { message: 'User not found' } })
    return res.status(200).json({ user })
  })
})
module.exports = router
