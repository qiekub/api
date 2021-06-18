const fs = require('fs')
const YAML = require('yaml')

module.exports = () => new Promise((resolve, reject) => {
  const filepath = __dirname+'/../../data/similarProjects.yml'
  fs.readFile(filepath, 'utf8', (error, data) => {
    if (error) {
      reject(error)
    } else {
      resolve(YAML.parse(data))
    }
  })
})
