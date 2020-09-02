const functions = require('firebase-functions')

const gqlServer = require('./server.js')

const runtimeOpts = {
  timeoutSeconds: 540, // 20seconds // 540
  memory: '2GB', // 512MB // 2GB
}

exports = module.exports = functions
// .region('europe-west3')
.region('us-central1')
// "Important: Firebase Hosting supports Cloud Functions in us-central1 only."
// source: https://firebase.google.com/docs/hosting/full-config#rewrites
.runWith(runtimeOpts)
.https.onRequest(gqlServer())
