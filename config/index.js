module.exports = {
  project: {
    name: 'ATM Rekognition',
    shortName: 'ATMR',
    themeColor: '#1d2229',
    backgroundColor: '#1d2229',
  },
  databaseUri:
    process.env.MONGODB_URL || 'mongodb://localhost:27017/rekognition',
}
