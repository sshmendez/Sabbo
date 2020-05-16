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

const { Sabbo } = require(path.resolve(__dirname, "./system.js"));
const Routes = require(path.resolve(__dirname, "./tools/routes.js"));
// add a route for uploading multiple files

const configfile = "../build/build.conf";
const buildPath = path.resolve("build");

let globalSabbo =  ((buildPath,configs)=>{
	return async (ctx, next)=>{
		ctx.sabbo.buildpath = buildPath
		ctx.sabbo.configs = configs
		await next()
	}
})(buildPath,{})

router.post("/create", koaBody, (ctx,next)=>{
    Routes.create(ctx.request.body)
});

router.get("/demos/:appname/:blob?", globalSabbo, async (ctx, next) => {
	let {appname, blob} = ctx.request.query
	let repo = await Routes.getWorktree({buildpath: ctx.sabbo.buildpath, appname, blob})
    await send(ctx, repo.path() ,{index: config.index});

	await next();
});
// add the router to our app



app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
	console.log("finishing request");
	await next();
});

console.log("starting: ");
Sabbo.cleanup(
	{
		buildPath,
	},
	true
);
// start the server
app.listen(3000);
``;
