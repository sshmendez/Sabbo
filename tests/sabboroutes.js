const path = require('path')

const local = path.resolve.bind(__dirname,'src')

const { Sabbo } = require(local('system.js'));
const {Routes} = require(local("tools/routes.js"));
const buildpath = local('../build')

let appname = 'testname'
let clonepath = local('..')
console.log(clonepath)
console.log(Sabbo.openBare)
Sabbo.cleanup({buildpath}, true)


let tests = {
    async tooBig(repo, config){
        let {buildpath, appname} = config

        refs = (await repo.getReferences()).map(ref=>ref.name())
        
        await Routes.getWorktree(config)

        await Routes.getRefs(config)

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
        console.log(c.id(), c.message());

    },
    async getAllCommits(repo, sabboctx){
        let gen = Routes.getCommits(sabboctx);
        let val;
        do{
            val = await gen.next()
        }
        while(!val.done);
    }
}
let run = (async ()=>{
    
    let config = {
        buildpath,
        appname,
        clonepath,
        branchname: 'master',
        commitid: 'HEAD',
        blob: Sabbo.blob(appname, 'master', 'HEAD')
    }
    await Routes.create(config,true)
    let repo = await Sabbo.openBare(config)
    for(test in tests){
        try{
            val = await tests[test](repo,config)
        } 
        catch(err){ 
            console.log(err)
        }
    }
})()
