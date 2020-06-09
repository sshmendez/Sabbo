const path = require('path')
const local = path.resolve.bind('.', __dirname, '../src');
console.log(local())
const {Sabbo} = require(local('Sabbo.js'));
const {Routes, Middlewares} = require(local("tools/routes.js"));
const GitHelpers = require(local("tools/GitHelpers.js"));
const Git = require('nodegit')

let tests = {
    async gitcred({gitpath}) {
        let username = gitpath.split('@', 1)[0]
        let cred = Git.Cred.sshKeyFromAgent(username)
        console.log(cred)
        console.log(process.env.SSH_AUTH_SOCK)
    },
    async cloneRemoteWorktree({buildpath,gitpath,appname,branchname,commitid}) {
        let blob = Sabbo.blob(appname, branchname, commitid)
        let worktree = await Sabbo.getWorktree({
            buildpath,
            gitpath,
            appname,
            branchname,
            commitid,
            blob
        })
    },
    async cloneRelativeCommit({servepath, gitpath, appname, branchname, commitid}){
        Sabbo.cloneRelativeCommit({gitpath, servepath, appname, branchname, commitstring: commitid})

    }
};


async function run(tests) {

    let config = {
        appname: 'te8st3',
        branchname: 'master',
        commitid: 'head',
        cloneFrom: local('../tests/testrepo'),
        buildpath: local('../../build'),
        gitpath: 'git@github.com:samendez/Sabbo.git'

    }
    config.servepath = Sabbo.servepath(config.buildpath, config.appname, '')
    await Sabbo.removeForce(config.servepath)

    let ctx = {}
    for (let test in tests) {
        try{
            console.log('Running', test + ":")
            let val = await tests[test](config)
        }
        catch(err){
            console.log(err)
        }

    }

}

run(tests)
