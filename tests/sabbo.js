let {
    Sabbo
} = require('../src/Sabbo.js')
let path = require('path')
let Git = require('nodegit')
const {Branch} = Git



let fse = require('fs-extra')

let local = path.resolve.bind(__dirname,'src')
console.log(local())
let {cleave_path} =require(local('tools/GitHelpers.js'))
/**
 * These tests were eventually moved into tools/GitHelpers.js
 * They might now fail as sabbo has changed substantially
 */

let tests = {
    async init(config, testconfig, ctx) {
        let {buildpath,gitpath, servepath, appname, branchname, commitid} = config

        gitpath = gitpath || Sabbo.gitpath(buildpath, appname)

        let bare;
        
        if(Sabbo.exists(buildpath, appname)){
            bare = Sabbo.openBare({buildpath, appname})
        }
        else{
            /**
             * 
             */
            bare = await Sabbo.create({buildpath, servepath: Sabbo.servepath(buildpath, appname, ''), gitpath}, config.cloneFrom)
        }
        ctx.bare = bare
    },
    async cloneTest(config, testconfig, ctx){
        let {buildpath, appname, branchname, commitid, blob} = config;

        
        await Sabbo.cleanWorking({buildpath, appname}, blob)
        let cloned = await Sabbo.clone({buildpath, appname})
        // let worktree = Sabbo.initializeWorktree(buildpath, appname, blob, branchname, commitid)


    }
};



async function run(tests) {

    let config = {
        appname: 'te8st3',
        branchname: 'master',
        commitid: 'head',
        cloneFrom: local('../tests/testrepo'),
        buildpath: local('../build')

    }

    config.blob = Sabbo.defaultBlob({appname: config.appname})
    config.servepath = Sabbo.servepath(config.buildpath, config.appname, config.blob)
    config.gitpath = Sabbo.gitpath(config.buildpath, config.appname)

    await Sabbo.cleanup(config, 1)
    /**
     * Only in cases of failure
     * Sabbo is not atomic, if building fails, you must either manually add a
     * remove.sabbo file to the buildpath or force delete it
     * be safe, especially if you haven't committed in about 2 days and your name is shane
     */
    // fse.removeSync(config.buildpath)
    console.log(config)
    let testconfigs = {
        'track_branch': {
            remote_name: 'origin',
            branch_name: 'linear',
        },

    }
    let ctx = {}
    for (let test in tests) {
        let testconfig = testconfigs[test] || {}
        if (testconfig.ignore) continue

        console.log('Running', test + ":")
        let val = await tests[test](config, testconfig, ctx)
        ctx = Object.assign(ctx, val)

    }

}

run(tests)
