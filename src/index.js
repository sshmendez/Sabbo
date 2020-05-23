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
const {Routes, globalSabboBuilder, getSabbo} = require(local("tools/routes.js"));
const GitHelpers = require(local('tools/GitHelpers'))
// add a route for uploading multiple files

const configfile = "../build/build.conf";
const buildpath = local("../build");
const worktree = {getWorkTree: true}


const commandmap = {
	'refs': GitHelpers.getLocalReferences,
	'commits': (repo, {oid, refname, numCommits})=>{

	}
}

let defaultblob = (appname)=>{
	return  Sabbo.blob(appname,"master", "HEAD")
}

let doubledot = (p)=>{
	return p.indexOf('..') >= 0
}

const isValidApp = (buildpath)=>{
	return (appname)=>Sabbo.isValidBare(buildpath,appname)
}

const deblob = getSabbo(isValidApp, defaultblob, Sabbo.parseBlob)
const globalSabbo = globalSabboBuilder(buildpath,{},deblob)

router.post("/create", koaBody, globalSabbo(), async (ctx,next)=>{

	let {appname, buildpath} = ctx.sabbo
	Routes.create({
		buildpath,
		appname,
		clonepath: ctx.request.body.clonepath},true)
	ctx.body = 'Successfully created ' + appname
	await next()

});

router.post('/demos/:appname/', koaBody, globalSabbo(worktree), async (ctx, next)=>{
	let {buildpath,appname} = ctx.sabbo
	let {command} = ctx.request.body

	if(Object.keys(commandmap).indexOf(command) > -1)
		ctx.body = await commandmap[command](ctx.sabbo,ctx.request.body)
	else
		ctx.body = 'Invalid Command ' + command


	await next()

})

router.get("/demos/:appname/:filename(.*)", globalSabbo(worktree), async (ctx,next)=>{
	debugger
	console.log(ctx.params)
	let filename = ctx.params.filename

	if(filename && doubledot(filename))
		ctx.body = 'Invalid Path ' + filename
	else 
		await send(ctx, filename,{root: ctx.sabbo.repo.workdir()});

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
