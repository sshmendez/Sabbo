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

    
    /**
     * filename is considered unsafe, therefore a path check is performed, and no path
     * is generated if a '..' or '/' is present
     */
    getWorktreePath: async function(sabboctx,filename){
        let repo = await Sabbo.getWorktree(sabboctx)
        filename = filename || ''
        console.log('path ' + path.dirname(repo.path()))
        console.log("filename "+ filename)
        return [repo, path.dirname(repo.path()), filename]
    
    },


 
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
 * kindof a monolith
 * 
 * as a dev, I think buildpath can be considered safe, it isn't subject to change by the user
 * as a sec expert, I'm not a sec expert
 */


let getSabbo = (isValidApp, defaultblob, parseBlob)=>{
        parseBlob = parseBlob || Sabbo.parseBlob
        return async (name_blob)=>{
            let blob;
            if(!isValidApp(name_blob)) blob = name_blob;
            else blob = await defaultblob(name_blob);
            return Object.assign(parseBlob(blob),{blob})
        }
    }


let globalSabboBuilder =  (buildpath,configs,deblob)=>
	(wtconf)=>{
        wtconf = wtconf
		return async (ctx, next)=>{
			let name_blob = ctx.params.appname || ctx.request.body.appname
            let sabboctx = await deblob(name_blob);
            if(wtconf.getWorkTree) repo = await Sabbo.getWorktree({buildpath, appname: sabboctx.appname});
            ctx.sabbo = Object.assign(ctx.sabbo || {}, sabboctx)
            Object.assign(ctx.sabbo, {repo})
			await next()
	}
}

let validate = ()=>{
    let {appname, branchname, commitid} = arguments
    let check = {appname};
    for(let attr in check){
        if(!notpath(check[attr])){
            throw Error({name: 'InvalidPath',message:'Invalid '+attr+': '+check[attr]})
        }
    }
    
    return arguments
}
const isValidApp = (buildpath)=>{
	return (appname)=>Sabbo.isValidBare({buildpath,appname})
}
/**
 * I don't think I want to export middleware, 
 * each of these functions requires too much different context
 * 
 * If I was gonna create middleware, I would have to make a number of decisions and I don't want to 
 * think about that right now
 */
module.exports = {Routes: routes, globalSabboBuilder,getSabbo, isValidApp}