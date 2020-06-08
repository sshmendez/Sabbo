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
const {Routes, deblob} = require(local("tools/routes.js"));
const GitHelpers = require(local('tools/GitHelpers'))
// add a route for uploading multiple files

const configfile = "../build/build.conf";
const buildpath = local("../../build");
 

const commandmap = {
	'blob': ({appname, branchname, commitid})=>Sabbo.blob(appname,branchname, commitid)
}

/**
 * An opomization can be added here
 * caching a bare repo for deblob.context will prevent reopening
 */
const globalSabbo = ((buildpath)=> async (ctx,next)=>{
	let name_blob = ctx.params.appname || ctx.request.body.appname
	let {appname, branchname, commitid} = await deblob.context({buildpath, name_blob})
	let blob = Sabbo.blob(appname, branchname, commitid)
	ctx.sabbo = ctx.sabbo || {}
	Object.assign(ctx.sabbo, {appname, branchname, commitid, blob})
	await next()
})(buildpath)

const getworktree = ((buildpath) => async (ctx, next)=>{
	let {appname, branchname, commitid, blob} = ctx.sabbo
	let worktree = await Sabbo.getWorktree({buildpath, appname, branchname, commitid, blob})
	ctx.sabbo.worktree = worktree
	await next()
})(buildpath)

router.post("/create", koaBody, async (ctx,next)=>{
	let {appname, clonepath} = ctx.request.body
	Routes.create({
		buildpath,
		appname,
		clonepath},true)
	ctx.body = 'Successfully created ' + appname
	await next()

});

router.post('/demos/:appname/', koaBody, globalSabbo, getworktree, async (ctx, next)=>{
	let {buildpath,appname} = ctx.sabbo
	let {command} = ctx.request.body

	if(Object.keys(commandmap).indexOf(command) > -1)
		ctx.body = await commandmap[command](ctx.sabbo,ctx.request.body)
	else
		ctx.body = 'Invalid Command ' + command


	await next()

})

router.get("/demos/:appname/:filename(.*)?", globalSabbo, getworktree, async (ctx,next)=>{
	let filename = ctx.params.filename || 'src/index.js'
	console.log(ctx.sabbo)
	await send(ctx, filename,{root: ctx.sabbo.worktree.workdir()});

	await next()
});


// add the router to our app



app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
	console.log("finishing request");
	await next();
});

let port = 3000
console.log("starting port " + port + ": ");
// start the server
app.listen(3000);
