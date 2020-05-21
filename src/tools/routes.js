const path = require('path')
const local = path.join.bind(__dirname,'..')
const {Sabbo} = require(local('system.js'))
const GitHelpers = require(local('tools/GitHelpers'))
const Git = require('nodegit')
const fse = require('fs-extra')
/**
 * This is a destruction of the available sabbo routes as functions
 * Writing them this way avoids some of the pain that
 * inline as anon function middlewares give testing 
 * 
 */

 /**
  * writing these as functions poses a challenge
  * I don't want:
  *     Koa Middleware
  *     Context objects
  *     next functions
  * I want each function to only take it's necessary args
  * 
  * I can write functions to turn these base functions into koa middleware
  * To do that I need a list of args, I've decided to structure a `routes` entry like this
  * 
  * {
  *     args: []
  *     func: Function
  * }
  * This structure is worth considering 
  */
 /**
  * I've figured it out. In the same breath as the last comment no less.
  * I'm gonna rely on objects, I know I said I wouldn't but:
  *     I can destructure them and only take what I need In the signature
  *     Works for me!
  * 
  * [Next Day]
  * All I want is to be explicit about what I need,
  * that way testing becomes so much easier
  */
let routes = {
    create: async ({buildpath, appname, clonepath},override) => {
        let config = Sabbo.buildConfig({appname, buildpath})
        clonepath = clonepath || "";
        if(Sabbo.exists(buildpath,appname) && override){
            await Sabbo.cleanup(config, false)
        }
        await Sabbo.create(config, clonepath);
        return config
    },
    getWorktree: async ({buildpath, appname, branchname, commitid, blob})=>{

        let repo;
        if(!Sabbo.exists(buildpath, appname, blob)){
            repo = Sabbo.initializeWorktree(buildpath, appname, blob, branchname, commitid)
        }
        else repo = Sabbo.open({buildpath, appname, blob})
        return repo
    },
    
    /**
     * filename is considered unsafe, therefore a path check is performed, and no path
     * is generated if a '..' or '/' is present
     */
    getWorktreePath: async function(sabboctx,filename){
        let repo = await this.getWorktree(sabboctx)
        filename = filename || ''
        console.log('path ' + path.dirname(repo.path()))
        console.log("filename "+ filename)
        return [repo, path.dirname(repo.path()), filename]
    
    },
    getRefs: async function({buildpath, appname}){
        let repo = await Sabbo.openBare(buildpath, appname)
        return (await repo.getReferences()).filter(ref=>!ref.isRemote()).map(ref=>ref.name())
    }, 

    /**
     * Checks refname first, the startoid, and if nothing else, start getting commits from head
     */
    getCommits: async function*({buildpath, appname},commitConfig) {
        let {refname, startoid} = commitConfig || {};

        let commits = [];

        let repo = await Sabbo.openBare({buildpath, appname});
        let walk = repo.createRevWalk();
        if(refname) walk.pushRef(refname);
        else walk.push(startoid || (await repo.getHeadCommit()));

        do{
            let oid
            try{
                oid = await walk.next();
            }
            catch(err){
                return
            }
            yield await repo.getCommit(oid);

        }
        while(true);

    }
}

/**
 * Turning each entry into a koa middleware
 * I think each signature should look like this
 * async (ctx,next)=>{
 *  routes[functionName](ctx)
 *  await next()
 * }
 */


/**
 * Function to Middleware
 */
function ftomid(func){
    return async (ctx, next, ctxmap)=>{
        ctxmap = ctxmap || (()=>{})
        let value = await func(ctx)
        //I'm allowing overriding context here
        //maybe I shouldn't
        if(value instanceof Object)
            Object.assign(ctx,value)
        else if(value) ctx[func.name] = value

        await next()
    }
}

// module.exports = Object.assign({}, 
//     ...Object.keys(routes).map((fn)=>({[fn]: ftomid(routes[fn])})))

/**
 * I don't think I want to export middleware, 
 * each of these functions requires too much different context
 * 
 * If I was gonna create middleware, I would have to make a number of decisions and I don't want to 
 * think about that right now
 */
module.exports = {Routes: routes}