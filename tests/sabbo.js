let {
    Sabbo
} = require('../src/system.js')
let fse = require('fs-extra')

appname = "te8st3";
let config = {
    appname,
    branch: 'master',
    commit: 'head',
    cloneFrom: '/Users/mendez/dev/proj/workspace/modulethief'

}
config = Sabbo.buildConfig(config)
console.log(config)
cleanup(config)
s = new Sabbo(config);
Sabbo.getPath(config).then(async (path) => {
    config.servepath = path
    try {
        await Sabbo.create(config)

    } catch {

    }

}).then(() => {
    setTimeout(() => {
        cleanup(config)
    }, 2000);
})
console.log(fse.removeSync(config.servepath))

function cleanup(config) {
    console.log("Cleaning up")
    fse.remove(config.gitpath)
    fse.remove(config.servepath)
}