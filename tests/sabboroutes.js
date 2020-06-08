const path = require('path');
const assert = require('assert');

const local = path.resolve.bind(__dirname,'src');

const { Sabbo } = require(local('Sabbo.js'));
const {Routes} = require(local("tools/routes.js"));
let deblob = Routes.deblob;
const GitHelpers = require(local("tools/GitHelpers.js"));

let tests;
tests = {
    async getRefs({repo,config}){
        let refs =  await repo.getReferences();
        let locals = refs.filter(ref=>!ref.isRemote());
        return (locals.map(ref=>ref.name()));
    },
    async checkoutBranch({repo, config, localconfig}){
        let {buildpath, appname, branchname, commitid, blob} = config;
        let worktree = await Sabbo.getWorktree({buildpath, appname, branchname, commitid, blob});
        let localrefs = await GitHelpers.getLocalReferences(repo);
        
        let {checkoutRef} = localconfig;

        try{
            await worktree.checkoutBranch('master');
        }
        catch(err){
            console.log(err);
        }
        
    },
    async tooBig({repo, config}){
        return
        let {buildpath, appname} = config;

        refs = (await repo.getReferences()).map(ref=>ref.name());
        let worktree = await Sabbo.getWorktree(config);
        return await GitHelpers.getLocalReferences(worktree);



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
        let gen = GitHelpers.getCommits(repo);
        let val;
        do{
            val = await gen.next();
        }
        while(!val.done);
        return true;
    },
    async cloneAllBranchesAndCommits({repo, config}){
        return
        let {buildpath, appname} = config;
        let refcommits = await tests.getAllBranchesAndCommits({repo,config});
        let checkout = async (ref,commitid)=>{

            let {branchname} = GitHelpers.cleaveRef(ref);
            let blob = Sabbo.blob(appname,branchname,commitid,"cloneall");
            let repo = await Sabbo.getWorktree({buildpath, appname, branchname, commitid, blob});
            let cid = (await repo.getHeadCommit()).id();
            return repo;
        };
        console.log(refcommits);
        for(let ref of Object.keys(refcommits)){
            console.log(ref);
            let commits = (await GitHelpers.getN(refcommits[ref])).map(c=>String(c.id()));
            for(let commitid of commits){
                let worktree = await checkout(ref, commitid);
                assert((await worktree.getHeadCommit()).id() == commitid);
            }
        }
    }, 
    async cloneAllBranches({repo, config}){
        let {buildpath,gitpath, appname} = config;
        let localrefs = await GitHelpers.getLocalReferences(repo);
        for(let ref of localrefs){
            let {branchname} = GitHelpers.cleaveRef(ref.name());
            let commitid = String(await repo.getBranchCommit(branchname));
            let blob = Sabbo.blob(appname, branchname, commitid, 'cab');
            let servepath = Sabbo.servepath(buildpath, appname, blob);
            await Sabbo.getWorktree({buildpath, gitpath, servepath, appname, branchname, commitid, blob});

        }
    },
    async verifyFiles({repo, config, localconfig}){
        return
        return Sabbo.listWorkTrees(appname,config.servepath);
    },
    async globalSabboTest({repo, config, localconfig}){
        let {buildpath} = config;
        let {name_blob} = localconfig;
        name_blob = name_blob || config.appname;
        
        let sabboctx = await deblob.context({buildpath, name_blob});
        let {appname, branchname, commitid} = sabboctx;
        let blob = Sabbo.blob(appname, branchname, commitid);
        let worktree = await Sabbo.getWorktree({buildpath, appname, branchname, commitid, blob});

        return worktree.workdir();
    }
}


let run = async (config, localconfigs, tests)=>{
    await Routes.create(config,true);
    let repo = await Sabbo.openBare(config);

    config = Object.assign({},config);

    config.commitid = await GitHelpers.relativeBranchCommit(repo, config.branchname, config.commitid);
    config.commitid = String(config.commitid);

    config.blob = Sabbo.blob(config.appname, config.branchname, config.commitid);

    for(test in tests){
        let msg = '-----------'+test+'-------------'
        console.log(msg);
        let conf = {
            repo,config,localconfig: localconfigs[test] || {}
        }
        try{
            val = await tests[test](conf);
            console.log(val);
        } 
        catch(err){ 
            console.log(err);
        }
        console.log('-'.repeat(msg.length));

    }
}


let main = (config,localconf, runtests) => async (ran)=>{
    try{
        await run(config, localconf, runtests);
    }
    catch(err){
        if(err.errno == -4 && err.errorFunction == 'Clone.clone' && !ran){
            await Sabbo.cleanupForce({buildpath: '/home/shmendez/dev/proj/workspace/sabbo/build/'});
            await main(true);
        }
        else{
            throw err;
        }
    }
}


let appname = 'testname';
let clonepath = local('../tests/testrepo');
const buildpath = local('../../build');

Sabbo.cleanup({buildpath});

let config = {
    buildpath,
    appname,
    clonepath,
    branchname: 'master',
    commitid: 'HEAD'
}


let localconf = {
    cloneTest: {
        branchname: 'newbranch'
    },
    checkoutBranch: {
        checkoutRef: 'origin/newbranch'
    }
}

let runtests;
runtests = ['globalSabboTest'];
runtests = runtests || Object.keys(tests);
runtests = runtests.map(t=>({[t]: tests[t]}));
runtests = Object.assign({}, ...runtests);


main(config,localconf, runtests)();