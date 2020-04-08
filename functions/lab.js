const { compileAnswers } = require('./functions.js')
const getMongoDbContext = require('./getMongoDbContext.js')

async function lab(){
	const mongodb = await getMongoDbContext()

	// 5e8d1b15f8fc8d350ba43bba

	compileAnswers(mongodb, new mongodb.ObjectID('5e743d99d083985272c9bf99'), (error,placeDocs)=>{
		console.log('placeDocs', JSON.stringify(placeDocs,null,4) )

		process.exit()
	})
}

lab()