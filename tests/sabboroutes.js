const path = require('path')
const assert = require('assert')

const local = path.resolve.bind(__dirname,'src')

const { Sabbo } = require(local('system.js'));
const {Routes, globalSabbo, isValidApp, getSabbo} = require(local("tools/routes.js"));
const GitHelpers = require(local("tools/GitHelpers.js"))
const buildpath = local('../../build')

let tests;
tests = {
    async getRefs({repo,config}){
        let refs =  await repo.getReferences()
        let locals = refs.filter(ref=>!ref.isRemote())
        return (locals.map(ref=>ref.name()))
    },
    async checkoutBranch({repo, config, localconfig}){
        let {buildpath, appname, branchname, commitid, blob} = config
        let worktree = await Sabbo.getWorktree({buildpath, appname, branchname, commitid, blob})
        let localrefs = await GitHelpers.getLocalReferences(repo)
        
        let {checkoutRef} = localconfig

        try{
            debugger
            await worktree.checkoutBranch('master')
        }
        catch(err){
            console.log(err)
        }
        
    },
    async tooBig({repo, config}){
        return
        let {buildpath, appname} = config

        refs = (await repo.getReferences()).map(ref=>ref.name())
        let worktree = await Sabbo.getWorktree(config)
        return await GitHelpers.getLocalReferences(worktree)



    },
    /**
     * {
     *  branchname: CommitGenerator,
     *  .
     *  .
     *  .
     * }
     */
    async getAllBranchesAndCommits({repo, config}){
        let localrefs = await GitHelpers.getLocalReferences(repo);
        localrefs = localrefs.map(r=>r.name());
        let refmap = {};
        for(let refname of localrefs){
            refmap[refname] = GitHelpers.getCommits(repo,{refname});
        }
        return refmap;
    },
    /**
     * Heres how to create a commit walker from a repo
     * if a ref is passed, push the ref, otherwise push head
     */
    async showCommits({repo,config,refname}) {
        let walk = repo.createRevWalk();
        if(refname) walk.pushRef(refname);
        else walk.push((await repo.getHeadCommit()));
        let oid = await walk.next();
        c = await repo.getCommit(oid);
        return (c.id(), c.message());

    },
    async getAllCommits({repo, sabboctx}){
        let gen = GitHelpers.getCommits(repo)
        let val;
        do{
            val = await gen.next()
        }
        while(!val.done);
        return true
    },
    async cloneTest({repo,config, localconf}){
        let {buildpath, appname, commitid, clonepath} = config
        let {branchname} = localconf
        let blob = Sabbo.blob(appname,branchname, commitid)
        let worktree = await Sabbo.initializeWorktree(buildpath, appname, blob, branchname, commitid)
        
        return worktree
    },
    async cloneAllBranchesAndCommits({repo, config}){
        let {buildpath, appname} = config
        let refcommits = await tests.getAllBranchesAndCommits({repo,config})
        let checkout = async (ref,commitid)=>{

            let {branchname} = GitHelpers.cleaveRef(ref)
            let blob = Sabbo.blob(appname,branchname,commitid,"cloneall")
            let repo = await Sabbo.getWorktree({buildpath, appname, branchname, commitid, blob})
            let cid = (await repo.getHeadCommit()).id()
            return repo
        }
        console.log(refcommits)
        for(let ref of Object.keys(refcommits)){
            console.log(ref)
            let commits = (await GitHelpers.getN(refcommits[ref])).map(c=>String(c.id()))
            for(let commitid of commits){
                let worktree = await checkout(ref, commitid)
                assert((await worktree.getHeadCommit()).id() == commitid)
            }
        }
    }, 
    async cloneAllBranches({repo, config}){
        let {buildpath,gitpath, appname} = config
        let localrefs = await GitHelpers.getLocalReferences(repo)
        debugger
        for(let ref of localrefs){
            let {branchname} = GitHelpers.cleaveRef(ref.name())
            let commitid = String(await repo.getBranchCommit(branchname))
            let blob = Sabbo.blob(appname, branchname, commitid, 'cab')
            let servepath = Sabbo.servepath(buildpath, appname, blob)
            await Sabbo.getWorktree({buildpath, gitpath, servepath, appname, branchname, commitid, blob})

        }
    },
    async verifyFiles({repo, config}){
        return Sabbo.listWorkTrees(appname,config.servepath)
    },
    async globalSabboTest({repo, config}){
        let {buildpath, name_blob} = config
        let truth = {
            worktree: await Sabbo.getWorktree({buildpath, 
                branchname: config.branchname,
                appname: config.appname,
                commitid: config.commitid,
                blob: config.blob}),
            deblob:   Object.assign({},config.parsed_blob,{blob: config.blob})
        }
        let validapp = isValidApp(buildpath)
        let defaultblob = (appname)=>{
            return  Sabbo.blob(appname,"master", "HEAD")
        }

        let disambig = getSabbo(validapp, defaultblob, Sabbo.parseBlob)
        let deblob = await disambig(name_blob)
        
        assert(
            Object.keys(deblob)
            .map(key=>truth.deblob[key] == deblob[key])
            .reduce((acc, cur)=> acc && cur)
        )

        let {appname, blob} = deblob
        let worktree = await Sabbo.getWorktree({buildpath, appname, blob})
 
        assert(worktree.workdir() == truth.worktree.workdir())
        
        return worktree.workdir()
    }
}


let appname = 'testname'
let clonepath = local('../tests/testrepo')
console.log(clonepath)
console.log(Sabbo.openBare)
Sabbo.cleanup({buildpath}, true)

let run = async (config, localconfigs, tests)=>{

    await Routes.create(config,true)
    let repo = await Sabbo.openBare(config)
    for(test in tests){
        let msg = '-----------'+test+'-------------'
        console.log(msg)
        let conf = {
            repo,config,localconfig: localconfigs[test] || {}
        }
        try{
            val = await tests[test](conf)
            console.log(val)
        } 
        catch(err){ 
            throw err
            console.log(err)
        }
        console.log('-'.repeat(msg.length))

    }
}


    
let config = {
    buildpath,
    appname,
    clonepath,
    branchname: 'master',
    commitid: 'HEAD',
    blob: Sabbo.blob(appname, 'master', 'HEAD'),
}


config.name_blob = config.blob
config.parsed_blob = Sabbo.parseBlob(config.blob)

let localconf = {
    cloneTest: {
        branchname: 'newbranch'
    },
    checkoutBranch: {
        checkoutRef: 'origin/newbranch'
    }
}

let runtests = ['getRefs', 'cloneAllBranches']
runtests = runtests || Object.keys(tests)
runtests = runtests.map(t=>({[t]: tests[t]}))
runtests = Object.assign({}, ...runtests)


let main = async (ran)=>{
    try{
        await run(config, localconf, runtests)
    }
    catch(err){
        if(err.errno == -4 && err.errorFunction == 'Clone.clone' && !ran){
            await Sabbo.cleanupForce({buildpath: '/home/shmendez/dev/proj/workspace/sabbo/build/'})
            await main(true)
        }
    }
}
main()