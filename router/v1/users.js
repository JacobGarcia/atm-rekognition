/* eslint-env node */
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

const express = require('express')
const router = new express.Router()
const multer = require('multer')
const mime = require('mime')

var AWS = require('aws-sdk')
// Set region
AWS.config.update({ region: 'us-east-1' })

const User = require(path.resolve('models/User'))
const Access = require(path.resolve('models/Access'))

// TODO: Upload to S3 bucket
// TODO: Create bucket for each client
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
  const { atm } = req.body
  const { photo, receipt } = req.files
  const s3 = new AWS.S3()

  if (!photo || !receipt) return res.status(400).json({
      success: false,
      message: 'Malformed Request. Face or receipt not specified',
    })
  // Upload receipt to S3
  fs.readFile(receipt[0].path, (error, data) => {
    if (error) {
      console.log(error)
    }

    const base64data = Buffer.from(data, 'binary')

    s3.putObject(
      {
        Bucket: 'nonbancomerclients',
        Key: receipt[0].filename,
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

  // call Alejin's service for facial recognition. Now using stub
  // use PythonShell to call python instance ?
  const response = {
    user: '507f1f77bcf86cd799439011',
    success: true,
    face: [[12, 32], [82, 21]],
    status: 200,
    telephone: '+525581452376',
  }
  const access = {
    ...response,
    atm,
  }
  // Insert access
  try {
    await new Access(access).save()
    // Create publish parameters
    // Create promise and SNS service object
    // Get S3 URL File
    const s3url = s3.getSignedUrl('getObject', {
      Bucket: 'nonbancomerclients',
      Key: receipt[0].filename,
    })
    const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
      .publish({
        Message: 'Hello there. Here is your receipt: ' + s3url /* required */,
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

    // Add receipt to User
    return User.findOneAndUpdate(
      { telephone: response.telephone },
      { $push: { receipts: s3url } }
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
  const { telephone, atm } = req.body
  const { photo, receipt } = req.files
  if (!photo || !telephone || !atm || !receipt) return res
      .status(400)
      .json({ success: false, message: 'Malformed request' })

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
      telephone,
    }
    const user = {
      ...response,
      atm,
      receipts: [receipt[0].filename],
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

      // Create publish parameters
      // Create promise and SNS service object
      const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
        .publish({
          Message:
            'Hello there! Thanks for using BBVA Bancomer services. Here is the receipt of your first transaction: https://drive.google.com/open?id=1bHWBDdbabk9EKkY64FZpFfZiS9UdTRap' /* required */,
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
      return res.status(200).json({ user })
    })
  })
})

module.exports = router
