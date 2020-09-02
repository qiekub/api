const gqlServer = require('./server.js')
const app = gqlServer()
const port = 11692 // "api2" in english alphabet letter positions
const host = '0.0.0.0'
const urlpath = '/graphql/v1'

app.use((req, res, next) => {
	res.append('Access-Control-Allow-Origin', ['*'])
	res.append('Access-Control-Allow-Methods', '*')
	res.append('Access-Control-Allow-Headers', '*')
	next()
})

app.listen(port, host, () => {
	console.log(`App listening at http://${host}:${port}${urlpath}`)
})
