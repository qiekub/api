const gqlServer = require('./server.js')
const app = gqlServer()
const port = 11692 // "api2" in english alphabet letter positions
const host = '0.0.0.0'
const urlpath = '/graphql/v1'

app.listen(port, host, () => {
	console.info(`App listening at http://${host}:${port}`)
})
