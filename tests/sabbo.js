let {
    Sabbo
} = require('../src/system.js')
let Git = require('nodegit')
let fse = require('fs-extra')

/**
 * These tests were eventually moved into tools/GitHelpers.js
 * They might now fail as sabbo has changed substantially
 */
function cleave_path(remote_ref) {
    let parts = remote_ref.split('/')
    let [remote_name, branch_name] = parts.slice(parts.length - 2)
    return {
        remote_name,
        branch_name
    }
}
let tests = {
    async init(config, testconfig, ctx) {
        const {
            Branch
        } = require('nodegit')
        let bare = await Sabbo(config, true, config.cloneFrom)

        let {
            appname,
            branch,
            commitid
        } = config
        let blob = await Sabbo.blob(appname, branch, commitid)
        let repo;
        console.log('created blob ' + blob)
        try {
            console.log(config.servepath)
            repo = await Sabbo.initializeSrc(config, blob)

        } catch (err) {
            console.log(err)
        }
        // console.log(await bare.getReferences(3))
    },

    async track_branch(config, {
        remote_name,
        branch_name
    }, ctx) {
        let {
            Branch,
        } = require('nodegit')
        let path = require('path')

        let bare = await Git.Repository.open(config.gitpath)
        let remote_path = path.join(remote_name, branch_name)

        let branch_commit = await bare.getBranchCommit(remote_path)
        let branch_ref = await bare.createBranch(branch_name, branch_commit)
        await Branch.setUpstream(branch_ref, remote_path)


    },

    async getAllRefNames(config, testconfig, ctx) {
        let bare = await Git.Repository.open(config.gitpath)
        let refs = await bare.getReferenceNames(3)
        console.log(refs)
        return {
            refs
        }
    },
    async getRemoteRefs(config, testconfig, ctx) {
        let bare = await Git.Repository.open(config.gitpath)
        let refs = await bare.getReferences()
        let remote_refs = refs
            .filter((ref) => ref.isRemote())
            .map(ref => ref.name())
        console.log(remote_refs)
        return {
            remote_refs
        }
    },

    async track_all(config, testconfig, ctx) {
        let {
            remote_refs
        } = ctx
        let refs = remote_refs.map(ref =>
            cleave_path(ref))
        refs.forEach(async ref => {
            try {
                await this.track_branch(config, ref)
            } catch (err) {
            }
        })
        return true
    },
};



async function run(tests) {

    let config = {
        appname: 'te8st3',
        branch: 'master',
        commitid: 'head',
        cloneFrom: '/Users/mendez/dev/proj/workspace/modulethief'

    }
    config = Sabbo.buildConfig(config)
    console.log(config)
    let testconfigs = {
        'track_branch': {
            remote_name: 'origin',
            branch_name: 'linear',
        },

    }
    console.log("Cleaning up")
    fse.remove(config.gitpath)
    fse.remove(config.servepath)
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
