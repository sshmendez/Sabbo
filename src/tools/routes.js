const path = require('path')
const local = path.join.bind(__dirname,'..')
const {Sabbo} = require(local('Sabbo.js'))
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
    create: async ({buildpath, gitpath, servepath, appname, clonepath}) => {
        let config = Sabbo.buildConfig({appname, buildpath})
        return Sabbo.create(config, clonepath);
    },
    cleanup: async ({buildpath, gitpath, servepath})=>{
        if(Sabbo.exists(buildpath,appname)){
            return Sabbo.cleanup({buildpath, gitpath, servepath}, false)
        }

    },
    /**
     * determines if name_blob is an appname or blob then constructs the sabboctx
     */
    deblob:  async ({buildpath, gitpath, servepath, name_blob, bareRepo, defaultctx})=>{
        defaultctx = defaultctx || {appname: name_blob, branchname: 'master', commitid: 'HEAD'};
         
        if(Sabbo.exists(buildpath, name_blob)) 
            sabboctx =  defaultctx;
        else
            sabboctx = Object.assign({},defaultctx,Sabbo.parseBlob(name_blob))
    
    
        let {appname, branchname, commitid} = sabboctx
        
        bareRepo = bareRepo || await Sabbo.openBare({buildpath,gitpath, appname});
    
        commitid = await Sabbo.resolveRelative({buildpath, gitpath, appname, branchname,commitstring: commitid, bareRepo})
    
    
        return {appname, branchname, commitid}
    }    
}

let koa = {
    globalSabbo: ((Routes)=>(buildpath)=> async (ctx,next)=>{
        let name_blob = ctx.params.appname || ctx.request.body.appname
        let {appname, branchname, commitid} = await Routes.deblob({buildpath, name_blob})
        let blob = Sabbo.blob(appname, branchname, commitid)
        ctx.sabbo = ctx.sabbo || {}
        Object.assign(ctx.sabbo, {appname, branchname, commitid, blob})
        await next()
    })(routes),
    getworktree: (buildpath) => async (ctx, next)=>{
        let {appname, branchname, commitid, blob} = ctx.sabbo
        let worktree = await Sabbo.getWorktree({buildpath, appname, branchname, commitid, blob})
        ctx.sabbo.worktree = worktree
        await next()
    }
    
}

let middlewares = {koa}



module.exports = {Routes: routes, Middlewares: middlewares}