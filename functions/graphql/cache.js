const fs = require('fs')

const { inspect } = require('util')

const cacheFolderPath = './cache/'
const cacheFilePath = cacheFolderPath+'cache.json'

let cache = {} // TODO this should be done by ApolloServer

if (!fs.existsSync(cacheFolderPath)) {
	fs.mkdirSync(cacheFolderPath)
}
if (fs.existsSync(cacheFilePath)) {
	fs.readFile(cacheFilePath, 'utf8', (error, data) => {
		try {
			if (error) {
				console.error('error while reading cache file:', error)
			} else {
				cache = JSON.parse(data || '{}') || {}
			}
		} catch (error) {
			console.error(error)
		}
	})
}

function getFilesizeInBytes(filepath) {
	if (!fs.existsSync(filepath)) {
		return 0
	}
	const stats = fs.statSync(filepath)
	const fileSizeInBytes = stats.size
	const fileSizeInMegabytes = fileSizeInBytes * 0.000001
	return fileSizeInMegabytes
}

function getStringBinarySize(string) {
	return Buffer.byteLength(string, 'utf8') * 0.000001
}

function capCacheFileSize(callback){
	const filesizeLimit = 100 // MB

	const currentSize = getFilesizeInBytes(cacheFilePath)
	if (currentSize > filesizeLimit) {
		const cacheEntries = Object.entries(cache)
		.sort((a, b) => b[1].lastSet - a[1].lastSet)

		for (const entry of cacheEntries) {
			delete cache[entry[0]]
			const newCacheFileSize = getStringBinarySize(JSON.stringify(cache))
			if (newCacheFileSize < filesizeLimit) {
				break
			}
		}

		fs.writeFile(cacheFilePath, JSON.stringify(cache), error=>{
			if (error) {
				console.error(error)
			}

			if (callback) {
				callback()
			}
		})
	}else{
		callback()
	}
}

function cacheKeyFromObjectSync(obj){
	return inspect(obj)
}

function isCachedSync(cacheKey){
	return !!cache[cacheKey]
}

function setCacheSync(cacheKey, value){
	capCacheFileSize(()=>{
		cache[cacheKey] = {
			value: JSON.stringify(value),
			lastSet: new Date()*1,
		}
		fs.writeFile(cacheFilePath, JSON.stringify(cache), error=>{
			if (error) {
				console.error(error)
			}
		})
	})
}

function getCacheSync(cacheKey){
	if (!!cache[cacheKey]) {
		const cacheContent = cache[cacheKey]
		return JSON.parse(cacheContent.value)
	}
	return null
}

module.exports = {
	cacheKeyFromObjectSync,
	isCachedSync,
	setCacheSync,
	getCacheSync,
}
