
const path = require('path')
let Git = require('nodegit')
const local = path.resolve.bind('.', __dirname, '../src');
let GitHelpers = require(local('tools/GitHelpers.js'))
let { Sabbo } = require(local("Sabbo.js"))


let tests = {
    async resolveRelative(repo,{commitstring, branchname}){
        let commitid = await GitHelpers.resolveRelative(repo,commitstring, branchname)
        return commitid
    }
}
let config = {
    repopath: local('../'),
    commitstring: 'HEAD',
    branchname: 'master'
}

async function run(config, tests) {

    let repo = await Git.Repository.open(config.repopath)
    for (let test in tests) {

        console.log('Running', test + ":")
        let val = await tests[test](repo,config)
        console.log(val)
    }

}

run(config,tests)

