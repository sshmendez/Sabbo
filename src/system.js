'use strict'
const fse = require("fs-extra");
const fstools = require("./tools/fstools.js")
const Git = require("nodegit");
const path = require("path");
const GitHelpers = require("./tools/GitHelpers.js")

Sabbo.canRemovePath = 'remove.sabbo'
let _makeRemovable = (dir)=>fse.writeFileSync(path.join(dir, Sabbo.canRemovePath), 1);


async function Sabbo(config, cloneUrl) {
    throw Error('Sabbo Depreciated, use Sabbo.create instead')
}


Sabbo.create = async ({buildpath, servepath, gitpath},cloneUrl)=>{
    let repo;
    if (!cloneUrl) {
        repo = await Git.Repository.init(gitpath, 1);
    } else {
        repo = await Git.Clone(cloneUrl, gitpath, {
            bare: 1
        })
        await GitHelpers.trackAll(repo);
    }
    fstools.mkdirs(servepath);

    [buildpath, servepath, gitpath].forEach(p=>_makeRemovable(p));

    return repo
}

/**
 * Allow config to pass a blob or the branch and commit
 * if branch exists, blob is ignored
 * 
 * this is a helper function, and will only function on a single machine system
 */
Sabbo.blob =  function () {
    let raw = Object.values(arguments).filter((val) => !!val)
    return raw.join(';')
    blob = new Buffer
        .from(JSON.stringify({
            appname,
            branch,
            commit
        }))
        .toString("base64");

}
Sabbo.gitpath = function(buildpath, appname){
    return path.join(buildpath,`git/${appname}`)
}
Sabbo.servepath = function(buildpath, appname, blob){
    appname = appname || appname
    return path.join(buildpath,`www/${appname}`,blob)
}

Sabbo.buildConfig = function (config) {
    config = Object.assign({}, config)
    if(!config.appname) throw {message: 'Appname must exist', name: 'AppnameException'}
    let buildpath = config.buildpath || path.resolve("build");
    let build = path.join.bind(path, buildpath);
    let gitpath = Sabbo.gitpath(buildpath, config.appname);
    let servepath = Sabbo.servepath(buildpath, config.appname, '');

    Object.assign(config, {
        buildpath: build(),
        gitpath,
        servepath,
    })


    return config
}

Sabbo.exists = function(buildpath,appname, blob){
    if(blob != undefined){
        return fse.existsSync(Sabbo.servepath(buildpath,appname,blob))
    }
    console.log(Sabbo.gitpath(buildpath,appname))
    return fse.existsSync(Sabbo.gitpath(buildpath,appname)) 

}
Sabbo.clone = async function(gitpath, servepath, branchname){
    let repo;
    let cloneargs = {checkoutBranch: branchname,fetchOpts: {
        callbacks: {
            certificateCheck: function () {
                return 0;
            },
        }
    }}


    try{
        repo = await Git.Clone(gitpath, servepath, cloneargs)
    }
    catch(err){
        if(err.errorFunction == 'Clone.clone'){
            let e = Error('Cloning '+gitpath+' failed: '+err.message)   
            e.name = 'CloneError'
            throw e
        }
        throw err
    }
    return repo
}
/**
 * This will fail if commitid isn't valid
 */
Sabbo.initializeWorktree = async function (gitpath, servepath, branchname, commitid) {

    let repo = await Sabbo.clone(gitpath, servepath, branchname)
    /**
     * Checkout branch, then detach head to commit
     */
    
    let headcommit = await repo.getBranchCommit(branchname)

    if(commitid != String(headcommit.id())){
        /**
         * As of now I am deleting the clone and throwing an error in this case
         * in the future I want this to work as intended
         */
        fse.remove(servepath)
        throw Error('Not Implemented')
 
        let opts =  {};
        let reference = await repo.getReference(branchname)
        opts.checkoutStrategy =  Git.Checkout.STRATEGY.SAFE | Git.Checkout.STRATEGY.RECREATE_MISSING;
        repo.setHeadDetached(commitid)
        let commit = await repo.getHeadCommit()
        let tree = await commit.getTree()
        Git.Checkout.tree(repo, tree, opts)

    } 
    return repo


  
}

Sabbo.parseBlob = function (blob) {
    let sect = blob.split(';')
    if(sect.length < 3) return 0
    return {
        appname: sect.shift(),
        branchname: sect.shift(),
        commitid: sect.shift(),
    };
};
Sabbo.isValidBare =  ({buildpath, appname})=>{
    let barepath = Sabbo.gitpath(buildpath, appname)
    return fse.existsSync(barepath)
}

/**
 * Resolve relative commits like HEAD~1
 * although currently GitHelpers.relativeCommit doesn't support anything but 'HEAD'
 */
Sabbo.resolveRelative = async ({buildpath, gitpath, appname, branchname,commitstring, bareRepo})=>{
    bareRepo = bareRepo || await Sabbo.openBare({buildpath, gitpath, appname}) 
    let commitid;   
    try{
        if(branchname) commitid = await GitHelpers.relativeBranchCommit(bareRepo, branchname, commitstring)
        else commitid = await GitHelpers.relativeCommit(bareRepo, commitstring)
        commitid = String(commitid)
    }
    catch(err){}
    return commitid

}

/**
 * It's okay to provide defaults because this is a high level function. 
 * however I need to make a distinction. sometimes providing defaults add ambiguity to the system.
 * if this were called in other internal functions I would want to make it explicit, but because this is gonna be a primary function used on the outside, 
 * making it as easy to use as possible is the best option
 * 
 * why shouldn't I provide defaults in routes.deblob.context? 
 * I do, I am providing bare repo. why? 
 * I want to provide a default method for accessing bare repo
 * I'm making a decision about how sabbo behaves.
 */
Sabbo.getWorktree = async ({buildpath, gitpath, servepath, appname, branchname, commitid, blob})=>{
    let worktree;

    gitpath = gitpath || Sabbo.gitpath(buildpath, appname);
    blob = blob || Sabbo.blob(appname, branchname, commitid);
    servepath = servepath || Sabbo.servepath(buildpath, appname,blob);

    if(!Sabbo.exists(buildpath, appname, blob)){
        worktree = await Sabbo.initializeWorktree(gitpath, servepath, branchname, commitid)
    }
    else worktree = await Sabbo.openWorkTree({buildpath, appname, blob})
    return {worktree, blob}
},

Sabbo.listWorkTrees = async(appname, servepath)=>{
    let publicApp = path.join(servepath, appname)
    return fse.readdir(publicApp)
}
/**
 * Maybe Write a function that returns worktrees; not sure if this is an api function or Sabbo
 */
// Sabbo.listWorktrees = async function ({appname, servepath}) {
//     fse.ls
// }
Sabbo.openWorkTree = async function ({buildpath, appname, blob}) {
    return Git.Repository.open(Sabbo.servepath(buildpath, appname, blob));
}
Sabbo.openBare = async function({buildpath, appname}){
    return Git.Repository.open(Sabbo.gitpath(buildpath,appname))
}


Sabbo.cleanLocalBare = function ({
    gitpath
}) {
    Sabbo.remove(gitpath)
}
Sabbo.cleanPublic = function({buildpath, appname}){
    return Sabbo.cleanWorktrees({buildpath, appname}, '')
}
Sabbo.cleanWorktrees = function ({buildpath, appname}, blobs) {
    if (blobs)
        blobs = blobs instanceof Array ? blobs : [blobs]
    else
        blobs = []
    
    blobs.filter(b=>!!b).forEach(blob => {
        let worktree = Sabbo.servepath(buildpath, appname, blob)
        Sabbo.remove(worktree)
    })

}
/**
 * Be safe with force please!
 */
Sabbo.cleanupForce = async function({buildpath}){
    fse.removeSync(buildpath)
}

Sabbo.cleanup = async function ({buildpath}) {
    Sabbo.remove(buildpath)
}

Sabbo.canRemove = function (desiredPath) {
    return fse.existsSync(path.join(desiredPath, Sabbo.canRemovePath))
}
/**
 * The removal checks should not be relied on
 * This was primarily added for testing
 * 
 * more stable and secure options include 
 *  running this in a docker instance
 *  running as a user with reduced privileges
 * 
 * be careful using this, it shouldn't be exposed to an api
 */
Sabbo.remove = function(removePath){
    if(Sabbo.canRemove(removePath) || Sabbo.canRemove(path.resolve(removePath, '..'))){
        fse.removeSync(removePath)
    }
}

module.exports = {
    Sabbo,
};