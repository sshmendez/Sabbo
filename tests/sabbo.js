let {
    Sabbo
} = require('../src/system.js')
let fse = require('fs-extra')

appname = "te8st3";
let config = {
    appname,
    branch: 'master',
    commitid: 'head',
    cloneFrom: '/Users/mendez/dev/proj/workspace/modulethief'

}
config = Sabbo.buildConfig(config)
console.log(config)
cleanup(config)
async function test1(config) {
    await Sabbo(config, true)
let { appname, branch, commitid } = config      
    let blob = await Sabbo.blob(appname, branch, commitid)
    console.log('created blob '+blob)
    try {
        console.log(config.servepath)
        await Sabbo.initializeSrc(config,blob)

    } catch (err) {
        
        console.log(err)
    }
    
}
test1(config)

function cleanup(config) {
    console.log("Cleaning up")
    fse.remove(config.gitpath)
    fse.remove(config.servepath)
}