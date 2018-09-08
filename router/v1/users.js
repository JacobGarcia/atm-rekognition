/* eslint-env node */
const path = require('path')
const express = require('express')
const winston = require('winston')
const router = new express.Router()
const base64Img = require('base64-img')
const shortid = require('shortid')
const PythonShell = require('python-shell')

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
      return new Access({ access }).save((error) => {
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

// Specify comparison from the GUI to the PI
router.route('/users/login').post((req, res) => {
  const { pin, site } = req.body
  // Validate that no field is empty
  if (!pin || !site) return res
      .status(400)
      .json({ success: false, message: 'Malformed request' })
  // Validate that site exists (dumb validation)
  return Site.findOne({ key: site }).exec((error, thesite) => {
    if (error) {
      winston.error(error)
      return res
        .status(500)
        .json({ success: 'false', message: 'Error finding that user.' }) // return shit if a server error occurs
    }
    if (!thesite) return res
        .status(406)
        .json({ success: false, message: 'The specified site does not exist' })

    return FrmUser.findOne({ pin }).exec((error, user) => {
      // if there are any errors, return the error
      if (error) {
        winston.error(error)
        return res
          .status(500)
          .json({ success: 'false', message: 'Error at finding users' }) // return shit if a server error occurs
      } else if (!user) return res
          .status(401)
          .json({ success: 'false', message: 'That user is not registered' })
      else if (user.isLogged) return res
          .status(405)
          .json({ success: false, message: 'Already in an active session' })

      global.io.to(site).emit('recognize', user.pin, 'login')
      return res.status(200).json({
        success: true,
        message:
          'The camera is ready to recognize the user. Now take the picture',
        user,
      })
    })
  })
})

// Register new user form
router.route('/users/signup').post((req, res) => {
  // Validate that no field is empty
  const { pin, privacy, site } = req.body
  if (!pin || !privacy || !site) return res
      .status(400)
      .json({ success: false, message: 'Malformed request' })
  // Validate that site exists (dumb validation)
  return Site.findOne({ key: site }).exec((error, thesite) => {
    if (error) {
      winston.error(error)
      return res
        .status(500)
        .json({ success: false, message: 'Error finding that site.', error }) // return shit if a server error occurs
    }
    if (!thesite) return res
        .status(406)
        .json({ success: false, message: 'The specified site does not exist' })

    // Check that the user is not already registered. Can be done via mongo but PATY GFYf
    return FrmUser.findOne({ pin }).exec((error, user) => {
      if (error) {
        winston.error(error)
        return res.status(400).json({
          success: false,
          message: 'The specified frmuser does not exist',
        })
      }
      if (user) return res
          .status(409)
          .json({ success: false, message: 'User already registered' })

      return new FrmUser({
        privacy,
        pin,
        site,
      }).save((error, user) => {
        // Save the user form
        if (error) {
          winston.error(error)
          return res.status(400).json({
            success: false,
            message: 'The specified user is already registered',
          })
        }
        global.io.to(site).emit('register', user.pin)
        return res.status(200).json({
          success: true,
          message:
            'Successfully registered user. Now it\'s time to take the picture!',
          user,
        })
      })
    })
  })
})

// Specify photo update to already registered user
router.route('/users/update').put((req, res) => {
  const { pin, privacy, site } = req.body
  // Validate that no field is empty
  if (!pin || !privacy || !site) return res
      .status(400)
      .json({ success: false, message: 'Malformed request' })
  // Validate that site exists (dumb validation)
  return Site.findOne({ key: site }).exec((error, thesite) => {
    if (error) {
      winston.error(error)
      return res
        .status(500)
        .json({ success: 'false', message: 'Error finding site' }) // return shit if a server error occurs
    }
    if (!thesite) return res
        .status(406)
        .json({ success: false, message: 'The specified site does not exist' })

    // Validate that admin has permissions to register new users
    return Admin.findOne({ _id: req.U_ID }).exec((error, admin) => {
      if (error) {
        winston.error(error)
        return res.status(400).json({
          success: 'false',
          message: 'The specified admin does not exist',
        })
      } else if (admin.role !== 'registrar' && admin.role !== 'camarabader') return res.status(401).json({
          success: false,
          message: 'Don\'t have permission to register new users',
        })

      // Validate that specified user exists
      return FrmUser.findOne({ pin }).exec((error, user) => {
        // if there are any errors, return the error
        if (error) {
          winston.error(error)
          return res
            .status(500)
            .json({ success: 'false', message: 'Error at finding users' }) // return shit if a server error occurs
        } else if (!user) return res.status(401).json({
            success: 'false',
            message: 'That user is not registered',
          })

        global.io.to(site).emit('update', user.pin)
        return res.status(200).json({
          success: true,
          message:
            'The camera is ready to update the photo of the user. Now take the picture',
          user,
        })
      })
    })
  })
})

router.route('/users/photo').put((req, res) => {
  const { pin, photo } = req.body
  const company = req._user.cmp

  if (!photo) return res
      .status(400)
      .json({ success: 'false', message: 'Image not found' })

  return Company.findOne({ _id: company }).exec((error, company) => {
    // no image found
    return base64Img.img(
      photo,
      'static/uploads',
      shortid.generate() + Date.now(),
      (error, filename) => {
        // Set photo file to new user registered
        FrmUser.findOneAndUpdate(
          { pin },
          { $set: { photo: '/' + filename } },
          { new: true }
        ).exec((error, user) => {
          if (error) {
            winston.error(error)
            return res.status(400).json({
              success: 'false',
              message: 'The specified frmuser does not exist',
              error: error,
            })
          } else if (!user) return res.status(404).json({
              success: false,
              message: 'The specified user does not exist',
            })

          // call code for AWS facial recognition. Now using stub
          // use PythonShell to call python instance

          const faceRecognition = new PythonShell('lib/python/rekognition.py', {
            pythonOptions: ['-u'],
            args: ['post', user.pin, process.env.PWD + user.photo],
          })

          /* Wait for the AWS response from Python to proceed */
          return faceRecognition.on('message', (message) => {
            // end the input stream and allow the process to exit
            faceRecognition.end((error) => {
              if (error) {
                winston.error(error)
                return res.status(500).json({
                  success: 'false',
                  message: 'Face Recognition Module Failed',
                })
              }
              const response = JSON.parse(message)

              const data = {
                success: response.validation !== 'false',
                photo,
                pin,
                site: user.site,
              }
              // Send photo to ATT and Connus
              global.io.to('ATT').emit('photo', data)
              global.io.to(company.name).emit('photo', data)

              // Insert access
              return new Access({
                timestamp: new Date(),
                event: data.success
                  ? 'Registro de personal exitoso'
                  : 'Intento de registro de personal',
                success: data.success,
                risk: data.success ? 0 : 1,
                zone: {
                  name: 'Centro',
                },
                status: data.success
                  ? 'Registro satisfactorio'
                  : 'Regsitro denegado. Fallo en la detección de rostro',
                site: user.site,
                access: 'Registro',
                pin: data.pin,
                photo: user.photo,
              }).save((error) => {
                if (error) {
                  winston.error(error)
                  return res
                    .status(500)
                    .json({ success: 'false', message: 'Could not save log.' })
                }
                return res.status(response.status).json({
                  success: response.validation,
                  message: response.description,
                  user,
                })
              })
            })
          })
        })
      }
    )
  })
})

// update user register photo
router.route('/users/updatephoto').put((req, res) => {
  const { pin, photo } = req.body
  if (!photo) return res
      .status(400)
      .json({ success: 'false', message: 'Image not found' })

  // no image found
  // Send photo to GUI
  const data = { photo, pin }
  global.io.to('ATT').emit('photo', data)
  return base64Img.img(
    photo,
    'static/uploads',
    shortid.generate() + Date.now(),
    (error, filename) => {
      // Set photo file to new user registered
      FrmUser.findOneAndUpdate(
        { pin },
        { $set: { photo: '/' + filename } },
        { new: true }
      ).exec((error, user) => {
        if (error) {
          winston.error(error)
          return res.status(400).json({
            success: 'false',
            message: 'The specified site does not exist',
          })
        } else if (!user) return res.status(404).json({
            success: false,
            message: 'The specified user does not exist',
          })

        // call code for AWS facial recognition. Now using stub
        // use PythonShell to call python instance
        const faceRecognition = new PythonShell('lib/python/rekognition.py', {
          pythonOptions: ['-u'],
          args: ['put', user.pin, process.env.PWD + user.photo],
        })

        /* Wait for the AWS response from Python to proceed */
        return faceRecognition.on('message', (message) => {
          // end the input stream and allow the process to exit
          faceRecognition.end((error) => {
            if (error) {
              winston.error(error)
              return res.status(500).json({
                success: 'false',
                message: 'Face Recognition Module Failed',
              })
            }

            const response = JSON.parse(message)

            return res.status(response.status).json({
              success: response.validation,
              message: response.description,
              user,
            })
          })
        })
      })
    }
  )
})

// Delete already registered users
router.route('/users/').delete((req, res) => {
  const { pin } = req.body

  FrmUser.remove({ pin }).exec((error, user) => {
    // if there are any errors, return the error
    if (error) {
      winston.error(error)
      return res
        .status(500)
        .json({ success: 'false', message: 'Error at removing user' }) // return shit if a server error occurs
    }
    // call code for AWS facial recognition. Now using stub
    // use PythonShell to call python instance
    const faceRecognition = new PythonShell('lib/python/rekognition.py', {
      pythonOptions: ['-u'],
      args: ['del', pin, process.env.PWD + user.photo],
    })

    /* Wait for the AWS response from Python to proceed */
    return faceRecognition.on('message', (message) => {
      // end the input stream and allow the process to exit
      faceRecognition.end((error) => {
        if (error) {
          winston.error(error)
          return res
            .status(500)
            .json({ success: 'false', message: 'FRM Script Failed' })
        }
        const response = JSON.parse(message)

        return res.status(response.status).json({
          success: response.validation,
          message: response.description,
          user,
        })
      })
    })
  })
})

module.exports = router
