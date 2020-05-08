let Git = require('nodegit')
let GitHelpers = require('../src/tools/GitHelpers.js')
let { Sabbo } = require('../src/system.js')

let config = {
    appname: 'testination',
    branch: 'master',
    commitid: 'head',
    cloneFrom: '/Users/mendez/dev/proj/workspace/modulethief',

}

config = Sabbo.buildConfig(config)

console.log(config)

Sabbo(config,true)

