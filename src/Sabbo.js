'use strict'
const fse = require("fs-extra");
const fstools = require("./tools/fstools.js")
const Git = require("nodegit");
const path = require("path");
const GitHelpers = require("./tools/GitHelpers.js")

Sabbo.canRemovePath = 'remove.sabbo'
let _makeRemovable = (dir)=>fse.writeFileSync(path.join(dir, Sabbo.canRemovePath), 1);

/**
 * Concepts:
 *  gitpath: path of directory containing bare repos
 *  servepath: path of directory containing clones of bare repos and builds of clones
 *  buildpath: used when gitpath or servepath is not provided; base path to generate default gitpath and servepath
 *  
 *  appname: the name of the bare repo;
 *           used to find the bare repo in gitpath
 *           and the servable worktree/build in servepath
 *  branchname: the name of a branch in the apps bare repo
 *  commitid: either the commit sha or relative commit string like 'HEAD'
 * 
 *  Sabbo Context (sabboctx): {buildpath, gitpath, servepath, appname, branchname, commitid}
 *            this is all you need in order to fetch an existing bare repo and build the proper clone
 *  
 * 
 *              
 *          
 */
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
            credentials: function(url, userName){
                console.log(userName)
                return Git.Cred.sshKeyFromAgent(userName)
            }
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
Sabbo.initializeWorktree = async function (gitpath, servepath, branchname, commitstring) {

    let repo = await Sabbo.clone(gitpath, servepath, branchname)
    /**
     * Checkout branch, then detach head to commit
     */
    
    let headcommit = await repo.getBranchCommit(branchname)
    
    let commitid = await Sabbo.resolveRelative({bareRepo: repo, branchname, commitstring})

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
/**
 * With this function i'm deciding that the blobs will never contain more information than is needed to uniquiely identify them
 * so, I can assume that they will only even need to be (appname, branchname, commitid)
 * with that, constructing blobs internally when provided that information is enough
 * 
 * blobs will never be user generated, they are for internal use only
 */
Sabbo.cloneRelativeCommit = async function({gitpath, servepath, appname, branchname, commitstring}){
    commitstring = commitstring || "HEAD"
    let servename = 'temp'+String(Math.random()).replace('.','1')
    let instancepath = path.join(servepath, servename)
    let repo = await Sabbo.clone(gitpath, instancepath, branchname)
    let commitid = await GitHelpers.resolveRelative(repo, commitstring, branchname)
    console.log(commitid)
    let blob = Sabbo.blob(appname, branchname, commitid)

    if(commitid != String((await repo.getBranchCommit(branchname)).id())){
        fse.remove(instancepath)
        throw Error('Not implemented; cannot checkout specific commits')
    }
    if(commitid != commitstring)
        fse.copy(instancepath, path.join(servepath, blob)).then(()=>fse.remove(instancepath))



}
Sabbo.parseBlob = function (blob) {
    let sect = blob.split(';')
    let keys = ["appname","branchname","commit"]
    let parsed = {}
    for(let i in sect){ 
        let s = sect[i]
        if(s) parsed[keys[i]] = s
    }
    return parsed
};
Sabbo.isValidBare =  ({buildpath, appname})=>{
    let barepath = Sabbo.gitpath(buildpath, appname)
    return fse.existsSync(barepath)
}

/**
 * Resolve relative commits like HEAD~1
 * although currently GitHelpers.relativeCommit doesn't support anything but 'HEAD'
 * 
 * if whats passed is a valid commit, returns that commit
 */
Sabbo.resolveRelative = async (repo, branchname, commitstring)=>{
    console.log("Depreciating Sabbo.resolveRelative, use githelper instead")
    return GitHelpers.resolveRelative(repo, commitstring, branchname)
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
 * 
 * I removed blob default. having a default blob created here means I have to reaturn it because it's a required segment in fetching                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
 */
Sabbo.getWorktree = async ({buildpath, gitpath, servepath, appname, branchname, commitid, blob})=>{
    let worktree;

    gitpath = gitpath || Sabbo.gitpath(buildpath, appname);
    servepath = servepath || Sabbo.servepath(buildpath, appname,blob);

    if(!Sabbo.exists(buildpath, appname, blob)){
        worktree = Sabbo.initializeWorktree(gitpath, servepath, branchname, commitid)
    }
    else worktree = Sabbo.openWorkTree({buildpath, appname, blob})
    return worktree
},

Sabbo.listWorkTrees = async(appname, servepath)=>{
    let publicApp = path.join(servepath, appname)
    return fse.readdir(publicApp)
}


Sabbo.openWorkTree = async function ({buildpath, appname, blob}) {
    return Git.Repository.open(Sabbo.servepath(buildpath, appname, blob));
}
Sabbo.openBare = async function({buildpath,gitpath, appname}){
    gitpath = gitpath || Sabbo.gitpath(buildpath, appname)
    return Git.Repository.open(gitpath)
}


Sabbo.cleanLocalBare = function ({
    gitpath
}) {
    Sabbo.remove(gitpath)
}
Sabbo.cleanPublic = function({buildpath,servepath, appname}){
    servepath = servepath || Sabbo.servepath(buildpath,appname, '')
    return Sabbo.remove(servepath)
}
Sabbo.cleanWorktrees = function ({servepath, appname}, blobs) {
    if (blobs)
        blobs = blobs instanceof Array ? blobs : [blobs]
    else
        blobs = []
    
    blobs.filter(b=>!!b).forEach(blob => {
        let worktree = path.join(servepath, blob)
        Sabbo.remove(worktree)
    })

}
/**
 * Be safe with force please!
 */
Sabbo.removeForce = async function(undesired){
    fse.removeSync(undesired)
}

Sabbo.cleanup = async function ({undesired: path}) {
    Sabbo.remove(undesired)
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