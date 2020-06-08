const Koa = require("koa");
const Router = require("@koa/router");
const koaBody = require("koa-body")({
	multipart: true,
});
const send = require("koa-send");


const path = require("path");
const local = path.resolve.bind('.', __dirname)

const {Routes, Middlewares} = require(local("tools/routes.js"));

const buildpath = local("../../build");

let globalSabbo = Middlewares.koa.globalSabbo(buildpath)
let getworktree = Middlewares.koa.getworktree(buildpath)


const app = new Koa();
const router = new Router();



router.post("/create", koaBody, async (ctx,next)=>{
	let {appname, clonepath} = ctx.request.body
	Routes.create({
		buildpath,
		appname,
		clonepath},true)
	ctx.body = 'Successfully created ' + appname
	await next()

});

router.get("/demos/:appname/:filename(.*)?", globalSabbo, getworktree, async (ctx,next)=>{
	let filename = ctx.params.filename || 'src/index.js'
	console.log(ctx.sabbo)
	await send(ctx, filename,{root: ctx.sabbo.worktree.workdir()});

	await next()
});


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
