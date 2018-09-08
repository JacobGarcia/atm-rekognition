/* eslint-env node */
const path = require('path')
const express = require('express')
const winston = require('winston')
const router = new express.Router()
const base64Img = require('base64-img')
const shortid = require('shortid')

const User = require(path.resolve('models/User'))
const Access = require(path.resolve('models/Access'))

// Recognize user based on photo file
// TODO: 1 to 1 ()
// TODO: Registro (stablish a relation between a face and a telephone)

// 1 to many (ask for which phone 'this' face has)
router.route('/users/recognize/one-to-many').post((req, res) => {
  const { photo, atm } = req.body

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
        atm,
      }
      // Insert access
      return new Access({ ...access }).save((error, access) => {
        if (error) {
          winston.error(error)
          return res
            .status(500)
            .json({ success: false, message: 'Could not save access log.' })
        }
        return res.status(response.status).json({ access })
      })
    }
  )
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
      winston.error(error)
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
            winston.error(error)
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
