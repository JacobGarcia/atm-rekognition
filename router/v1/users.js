/* eslint-env node */
const path = require('path')
const crypto = require('crypto')
const express = require('express')
const router = new express.Router()
const base64Img = require('base64-img')
const shortid = require('shortid')
const multer = require('multer')
const mime = require('mime')

var AWS = require('aws-sdk')
// Set region
AWS.config.update({ region: 'us-east-1' })

const User = require(path.resolve('models/User'))
const Access = require(path.resolve('models/Access'))

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

const upload = multer({ storage })

// 1 to 1 (web app usage)
router.route('/users/recognize/one-to-one').post((req, res) => {
  const { photo } = req.body

  if (!photo) return res
      .status(400)
      .json({ success: false, message: 'Face not specified' })

  // decode base64 image
  return base64Img.img(
    photo,
    'static/uploads',
    shortid.generate() + Date.now(),
    (error, filename) => {
      // call Alejin's service for facial recognition. Now using stub
      // use PythonShell to call python instance ?
      // const faceRecognition = new PythonShell('lib/python/rekognition.py', {
      //   pythonOptions: ['-u'],
      //   args: ['get', pin, process.env.PWD + '/' + filename],
      // })

      /* Wait for the response from Python to proceed */
      // end the input stream and allow the process to exit
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
      return new Access({ ...access }).save((error, access) => {
        if (error) {
          console.error(error)
          return res
            .status(500)
            .json({ success: false, message: 'Could not save access log.' })
        }
        return res.status(response.status).json({ access })
      })
    }
  )
})

// 1 to many (ask for which phone 'this' face has)
router
  .route('/users/recognize/one-to-many')
  .post(upload.single('photo'), async (req, res) => {
    const { atm } = req.body
    const photo = req.file

    if (!photo) return res
        .status(400)
        .json({ success: false, message: 'Face not specified' })

    // call Alejin's service for facial recognition. Now using stub
    // use PythonShell to call python instance ?

    /* Wait for the response from Python to proceed */
    // end the input stream and allow the process to exit
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
      const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' })
        .publish({
          Message:
            'Hello there. Here is your receipt: https://drive.google.com/open?id=1bHWBDdbabk9EKkY64FZpFfZiS9UdTRap' /* required */,
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

      return res.status(response.status).json({ access })
    } catch (error) {
      console.error(error)
      return res
        .status(500)
        .json({ success: false, message: 'Could not save access log.' })
    }
  })

// Register (stablish a relation between a face and a telephone)
router.route('/users/signup').post((req, res) => {
  // Validate that no field is empty
  const { photo, telephone, atm } = req.body
  if (!photo || !telephone || !atm) return res
      .status(400)
      .json({ success: false, message: 'Malformed request' })

  // Check that the telephone is not already registered. TODO: Not just mark as an invalid request
  return User.findOne({ telephone }).exec((error, user) => {
    if (error) {
      console.error(error)
      return res.status(500).json({
        success: false,
        message: 'Error while looking for user',
      })
    }
    if (user) return res
        .status(409)
        .json({ success: false, message: 'User already registered' })

    // Call Python to register user
    return base64Img.img(
      photo,
      'static/uploads',
      shortid.generate() + Date.now(),
      (error, filename) => {
        const response = {
          face: [[12, 32], [82, 21]],
          telephone,
        }
        const user = {
          ...response,
          atm,
        }
        return new User({ ...user }).save((error, user) => {
          // Save the user form
          if (error) {
            console.error(error)
            return res.status(500).json({
              success: false,
              message: 'Error while saving user',
              error,
            })
          }
          return res.status(200).json({ user })
        })
      }
    )
  })
})

module.exports = router
