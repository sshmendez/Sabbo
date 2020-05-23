const path = require('path')
const assert = require('assert')

const local = path.resolve.bind(__dirname,'src')

const { Sabbo } = require(local('system.js'));
const {Routes, globalSabbo, isValidApp, getSabbo} = require(local("tools/routes.js"));
const GitHelpers = require(local("tools/GitHelpers.js"))
const buildpath = local('../build')

let appname = 'testname'
let clonepath = local('..')
console.log(clonepath)
console.log(Sabbo.openBare)
Sabbo.cleanup({buildpath}, true)


let tests = {
    async getRefs(repo,config){
        let refs =  await repo.getReferences()
        let locals = refs.filter(ref=>!ref.isRemote())
        return (locals.map(ref=>ref.name()))
    },
    async tooBig(repo, config){
        let {buildpath, appname} = config

        refs = (await repo.getReferences()).map(ref=>ref.name())
        let worktree = await Sabbo.getWorktree(config)
        return await GitHelpers.getLocalReferences(worktree)



    },
    /**
     * Heres how to create a commit walker from a repo
     * if a ref is passed, push the ref, otherwise push head
     */
    async showCommits(repo,config,refname) {
        let walk = repo.createRevWalk();
        if(refname) walk.pushRef(refname);
        else walk.push((await repo.getHeadCommit()));
        let oid = await walk.next();
        c = await repo.getCommit(oid);
        return (c.id(), c.message());

    },
    async getAllCommits(repo, sabboctx){
        let gen = GitHelpers.getCommits(repo)
        let val;
        do{
            val = await gen.next()
        }
        while(!val.done);
        return true
    },
    async globalSabboTest(repo, config){
        let {buildpath, name_blob} = config
        let truth = {
            worktree: await Sabbo.getWorktree({buildpath, appname: config.appname, blob: config.blob}),
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
        
        return repo.workdir()
    }
}
let run = (async ()=>{
    
    let config = {
        buildpath,
        appname,
        clonepath,
        branchname: 'master',
        commitid: 'HEAD',
        blob: Sabbo.blob(appname, 'master', 'HEAD'),
    }
    let truth = {}
    config.name_blob = config.blob

    config.parsed_blob = Sabbo.parseBlob(config.blob)
    await Routes.create(config,true)
    let repo = await Sabbo.openBare(config)
    for(test in tests){
        try{
            val = await tests[test](repo,config)
            console.log(test,": ",val)
        } 
        catch(err){ 
            // throw err
            // console.log(err)
        }
    }
})()
