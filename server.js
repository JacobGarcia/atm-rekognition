/* eslint-env node */
const path = require('path') // Native node.js path resolver
const express = require('express') // API framework
const helmet = require('helmet') // Basic headers protection
const hpp = require('hpp') // Protection against parameter pollution

const winston = require('winston') // Logger tool
const dotenv = require('dotenv') // Manager for evironment variables
const mongoose = require('mongoose') // Mongo object modeling
const bodyParser = require('body-parser') // Parser for incoming requests

const { databaseUri } = require(path.resolve('config')) // Configuration variables

/* Winston logger object */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logfile.log' }),
  ],
})

const v1 = require(path.resolve('router/v1')) // API router location

/* Environment variables */
const { PORT = 8080, SERVER_ONLY = false } = process.env
const mode = process.env.NODE_ENV
const isProduction = mode === 'production'

/* Environment configuration based on file */
dotenv.config({
  path: path.resolve(
    `config/.env${isProduction ? '.production' : '.development'}`
  ),
})

/* Connecting to Database */

mongoose
  .connect(
    databaseUri,
    {
      useNewUrlParser: true,
    }
  )
  .then(() => {
    logger.info('Connected to DB')
  })
  .catch(() => {
    logger.error('\n|\n|  Could not connect to DB\n|')
  })
mongoose.set('useCreateIndex', true)

const app = express() // App definition

/* App configurations */
app.use(helmet())
app.use(hpp())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/v1', v1)

if (!isProduction && !SERVER_ONLY) app.use(require(path.resolve('config/webpackDevServer'))) // Use webpackDevServer if development environment
// Send compilated version for the index if has been build with server flag (yarn build:prod)
if (isProduction && !SERVER_ONLY) {
  app.use(express.static(path.resolve('dist')))
  app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')))
}

// Start server
app.listen(PORT, () =>
  console.info(`React boilerplate is now running\n
    Port: \t\t${PORT}
    Server only: \t${SERVER_ONLY}
    Mode: \t\t${mode}`)
)
