const gqlServer = require('./server.js')
const app = gqlServer()
const port = 11692 // api2 in english alphabet letter positions
const host = '0.0.0.0'
const path = '/graphql/v1'

app.listen(port, host, () => {
	console.log(`App listening at http://${host}:${port}${path}`)
})