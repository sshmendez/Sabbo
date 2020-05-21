const Koa = require("koa");
const Router = require("@koa/router");
const koaBody = require("koa-body")({
	multipart: true,
});

const fse = require("fs-extra");
const app = new Koa();
const router = new Router();
const path = require("path");
const send = require("koa-send");

const local = path.resolve.bind('.', __dirname)
console.log(local('system.js'))
const { Sabbo } = require(local("system.js"));
const {Routes} = require(local("tools/routes.js"));
// add a route for uploading multiple files

const configfile = "../build/build.conf";
const buildpath = local("../build");

const commandmap = {
	'refs': Routes.getRefs,
	'commits': Routes.getCommits
}

let defaultblob = (appname)=>{
	return  Sabbo.blob(appname,"master", "HEAD")
}
let notpath = (notpathy)=>{
	return notpathy == path.basename(notpathy)
}
let doubledot = (p)=>{
	return p.indexOf('..') >= 0
}
/**
 * kindof a monolith
 * 
 * as a dev, I think buildpath can be considered safe, it isn't subject to change by the user
 * as a sec expert, I'm not a sec expert
 */
let globalSabbo =  ((buildpath,configs, defaultblob)=>{
	return async (ctx, next)=>{
		let name_blob = ctx.params.appname || ctx.request.body.appname
		console.log('appname:',name_blob)
		let blob;
		let {appname, branchname, commitid} = Sabbo.parseBlob(name_blob)
		
		if(appname)
			blob = name_blob

		else{
			blob = await defaultblob(name_blob);
			console.log(blob);
			({appname, branchname, commitid} = Sabbo.parseBlob(blob))
		}


		let check = {appname}
		for(let attr in check){
			if(!notpath(check[attr])){
				debugger
				ctx.body = 'Invalid '+attr+': '+check[attr]
				return
			}
		}
		
		configs.blob = configs.blob || {}
		
		ctx.sabbo = Object.assign(ctx.sabbo || {},{
			config: configs.blob, buildpath, appname,branchname, commitid, blob
		})

		
		await next()
	}
})(buildpath,{},defaultblob)
    

router.post("/create", koaBody, globalSabbo, async (ctx,next)=>{

	let {appname, buildpath} = ctx.sabbo
	Routes.create({
		buildpath,
		appname,
		clonepath: ctx.request.body.clonepath},true)
	ctx.body = 'Successfully created ' + appname
	await next()

});

router.post('/demos/:appname/', koaBody, globalSabbo, async (ctx, next)=>{
	let {buildpath,appname} = ctx.sabbo
	let {command} = ctx.request.body

	if(Object.keys(commandmap).indexOf(command) > -1)
		ctx.body = await commandmap[command](ctx.sabbo,ctx.request.body)
	else
		ctx.body = 'Invalid Command ' + command


	await next()

})

router.get("/demos/:appname/:filename(.*)", globalSabbo, async (ctx,next)=>{
	console.log(ctx.params)
	let dirpath,filename
	try{
		[_,dirpath,filename] = await Routes.getWorktreePath(ctx.sabbo,ctx.params.filename)
	}
	catch(err){
		console.log(err)
		await next()
		return
	}
	console.log(filename)
	filename = filename || 'filename'
	console.log(filename)
	if(filename && doubledot(filename))
		ctx.body = 'Invalid Path ' + filename
	else 
		await send(ctx, filename,{root: dirpath});

	await next()
});


// add the router to our app



app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
	console.log("finishing request");
	await next();
});

console.log("starting: ");
Sabbo.remove(Sabbo.servepath(buildpath));
// start the server
app.listen(3000);
``;
