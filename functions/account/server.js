const functions = require('firebase-functions')

const getMongoDbContext = require('../getMongoDbContext.js')

const secretManager = require('../secretManager.js')
const getSecretAsync = secretManager.getSecretAsync

const compression = require('../github.com-patrickmichalina-compression/index.js') // https://github.com/patrickmichalina/compression
// const shrinkRay = require('shrink-ray')

// const speakeasy = require('speakeasy')
// const argon2 = require('argon2')
// const secret = speakeasy.generateSecret()
// argon2.hash(secret.base32).then(hash => {
// 	console.log('hash', hash)
// })

const express = require('express')
const passport = require('passport')

const session = require('express-session')
const MongoStore = require('connect-mongo')(session);
// const MongoDBStore = require('connect-mongodb-session')(session)

const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const GitHubStrategy = require('passport-github2').Strategy
const TwitterStrategy = require('passport-twitter').Strategy
const partials = require('express-partials')

const url_path = '/qiekub/us-central1/account'



function addDoc(collection, properties){
	return new Promise((resolve, reject) => {
		collection.insertOne({
			__typename: 'Doc',
			properties: {
				...properties,
			},
			metadata: {
				created: new Date(),
				lastModified: new Date(),
				__typename: 'Metadata',
			},
		}).then(result => {
			if (!!result.insertedId) {
				resolve(result.insertedId)
			}else{
				const error = new Error('Unknown error while creating the doc.')
				console.error(error)
				reject(error)
			}
		}).catch(error=>{
			console.error(error)
			reject(error)
		})
	})
}

function doesProfileExist(mongodb, profileID){
	return new Promise((resolve, reject) => {
		if (!!profileID) {
			mongodb.Profiles_collection.findOne({
				'properties.__typename': 'Profile',
				'_id': profileID,
			})
			.then(profileDoc => {
				if (!!profileDoc) {
					resolve(true)
				}else{
					resolve(false)
				}
			})
			.catch(error => reject(error) )
		}else{
			resolve(false)
		}
	})
}

function addProfileToAccount(mongodb, profileID, accountID){
	return new Promise((resolve, reject) => {
		mongodb.Accounts_collection.updateOne({
			_id: accountID,
		}, {$set: {
			'properties.forProfileID': profileID,
		}})
		.then(result => {
			if (result.result.n > 0) {
				resolve(profileID)
			}else{
				reject('Could not associate profile with account.')
			}
		})
		.catch(error => reject(error) )
	})
}

function getProfileFromStrategyResult(profile, currentProfileID){
	return new Promise(async (resolve, reject) => {
		const mongodb = await getMongoDbContext()

		// check if current-profile exists
		if (mongodb.ObjectID.isValid(currentProfileID)) {
			currentProfileID = new mongodb.ObjectID(currentProfileID)
			if (!(await doesProfileExist(mongodb, currentProfileID))) {
				currentProfileID = null
			}
		}else{
			currentProfileID = null
		}

		const provider = profile.provider
		const uid = profile.uid

		const newAccountDoc = {
			__typename: 'Account',
			uid: profile.id,
			provider: profile.provider,
			username: profile.username,
			displayName: profile.displayName,
			forProfileID: currentProfileID,
		}
		const newProfileDoc = {
			__typename: 'Profile',
			displayName: profile.displayName,
		}


		mongodb.Accounts_collection.findOne({
			'properties.__typename': 'Account',
			'properties.provider': newAccountDoc.provider,
			'properties.uid': newAccountDoc.uid,
		})
		.then(async accountDoc => {
			if (!!accountDoc) {
				let forProfileID = accountDoc.properties.forProfileID
				if (!(await doesProfileExist(mongodb, forProfileID))) {
					forProfileID = null
				}

				if (!!currentProfileID) {
					if (!!forProfileID) {
						if (currentProfileID+'' === forProfileID+'') {
							resolve(currentProfileID)
						}else{
							reject('Account is already associated.')
						}
					}else{
						// add currentProfileID to account
						addProfileToAccount(mongodb, currentProfileID, accountDoc._id)
						.then(profileID => resolve(currentProfileID) )
						.catch(error => reject(error) )
					}
				}else{
					if (!!forProfileID) {
						resolve(forProfileID)
					}else{
						// create new profile
						addDoc(mongodb.Profiles_collection, newProfileDoc)
						.then(profileID => {
							// add new-profileID to account
							addProfileToAccount(mongodb, profileID, accountDoc._id)
							.then(profileID => resolve(profileID) )
							.catch(error => reject(error) )
						})
						.catch(error => reject(error) )
					}
				}
			}else{
				if (!!currentProfileID) {
					// create new account-doc
					addDoc(mongodb.Accounts_collection, newAccountDoc)
					.then(accountID => resolve(currentProfileID) )
					.catch(error => reject(error) )
				}else{
					// create new profile
					addDoc(mongodb.Profiles_collection, newProfileDoc)
					.then(profileID => {
						// add new-profileID to newAccountDoc
						newAccountDoc.forProfileID = profileID
						currentProfileID = profileID

						// create new account-doc
						addDoc(mongodb.Accounts_collection, newAccountDoc)
						.then(accountID => resolve(currentProfileID) )
						.catch(error => reject(error) )
					})
					.catch(error => reject(error) )
				}
			}
		})
		.catch(error => reject(error) )
	})
}



// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next()
	}
	res.redirect(url_path+'/')
}



async function session_middleware(req, res, next) {

	const mongodb = await getMongoDbContext()

	const sessionTTL = 60 * 60 * 24 * 14 // = 14 days

	const store = new MongoStore({
		client: mongodb.client,
		dbName: 'Auth',
		collection: 'Sessions',
		autoRemove: 'native', // Default
		autoRemoveInterval: 1,
		ttl: sessionTTL,
		touchAfter: 24 * 3600, // time period in seconds
		secret: false,
		stringify: false,
	})

	session({
		secret: 'This is a secret',
		cookie: {
			maxAge: 1000 * sessionTTL,
		},
		store,
		saveUninitialized: false, // don't create session until something stored
		resave: false, // don't save session if unmodified
		unset: 'destroy',
	})(req, res, next)
}

async function passport_middleware(req, res, next) {

	const currentProfileID = (
		   !!req.session
		&& !!req.session.passport
		&& !!req.session.passport.user
		? req.session.passport.user
		: null
	)


	// Passport session setup.
	//   To support persistent login sessions, Passport needs to be able to
	//   serialize users into and deserialize users out of the session.  Typically,
	//   this will be as simple as storing the user ID when serializing, and finding
	//   the user by ID when deserializing.  However, since this example does not
	//   have a database of user records, the complete GitHub profile is serialized
	//   and deserialized.
	passport.serializeUser(function(profileDoc, done) {
		done(null, profileDoc)
	})
	passport.deserializeUser(function(profileDoc, done) {
		done(null, profileDoc)
	})
	
	
	passport.use(new GitHubStrategy({
		clientID: await getSecretAsync('GITHUB_CLIENT_ID'),
		clientSecret: await getSecretAsync('GITHUB_CLIENT_SECRET'),
		callbackURL: url_path+'/auth/github/callback/',
	}, (accessToken, refreshToken, profile, done)=>{
		getProfileFromStrategyResult(profile, currentProfileID)
		.then(profileDoc => done(null, profileDoc))
		.catch(error => done(error, null))
	}))

	passport.use(new TwitterStrategy({
		consumerKey: await getSecretAsync('TWITTER_CONSUMER_KEY'),
		consumerSecret: await getSecretAsync('TWITTER_CONSUMER_SECRET'),
		callbackURL: url_path+'/auth/twitter/callback/',
	}, (token, tokenSecret, profile, done)=>{
		getProfileFromStrategyResult(profile, currentProfileID)
		.then(profileDoc => done(null, profileDoc))
		.catch(error => done(error, null))
	}))


	passport.initialize()(req, res, next)
}

async function session_metadata_middleware(req, res, next) {

	if (
		!!req.session
		&& !!req.session.passport
		&& !!req.session.passport.user
		&& !(!!req.session.metadata)
	) {
		req.session.metadata = {
			user_agent: req.headers['user-agent'],
			started: new Date(),
		}
	}

	next()
}




function server() {


	const app = express()


	// configure Express
	app.set('views', __dirname + '/views')
	app.set('view engine', 'ejs')

	app.use(compression({brotli:{enabled:true,zlib:{}}}))

	app.use(partials())
	app.use(bodyParser.urlencoded({ extended: true }))
	app.use(bodyParser.json())
	app.use(methodOverride())

	app.use(session_middleware)

	app.use(passport_middleware)
	app.use(passport.session())

	app.use(session_metadata_middleware)

	// app.use(express.static(__dirname + '/public'))


	app.get('/', function(req, res){
		res.render('index', { user: req.user })
	})

	app.get('/auth/github/', passport.authenticate('github', {
		scope: ['user:email'],
	}))
	app.get('/auth/github/callback/', passport.authenticate('github', {
		failureRedirect: url_path+'/',
	}), (req, res)=>{
		res.redirect(url_path+'/')
	})

	app.get('/auth/twitter/', passport.authenticate('twitter'))
	app.get('/auth/twitter/callback/', passport.authenticate('twitter', {
		failureRedirect: url_path+'/',
	}), (req, res)=>{
		res.redirect(url_path+'/')
	})


	app.get('/logout/', function(req, res){
		req.session.cookie.maxAge = 0 // set the maxAge to zero, to delete the cookie
		req.logout() // also forget the login-state
		req.session.save(error=>{ // save the above setting
			if (error) {
				console.error(error)
			}else{
				res.redirect(url_path+'/') // send the updated cookie to the user and go to the start page

				req.session.destroy(req.sessionID, error=>{ // remove session from store
					if (error) {
						console.error(error)
					}
				})
			}
		})
	})

	return app
}



const runtimeOpts = {
	timeoutSeconds: 20, // 20seconds
	memory: '512MB',
}

exports = module.exports = functions
// .region('europe-west3')
.region('us-central1')
// "Important: Firebase Hosting supports Cloud Functions in us-central1 only."
// source: https://firebase.google.com/docs/hosting/full-config#rewrites
.runWith(runtimeOpts)
.https
.onRequest(server())


