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

const { Sabbo } = require(path.resolve(__dirname, "./system"));
// add a route for uploading multiple files

configs = {};
const configfile = "../build/build.conf";
const buildPath = path.resolve("build");

router.post("/create", koaBody, async (ctx, next) => {
	/**
	 * I'm sorry. This was just too cool
	 */
	let config = Sabbo.buildConfig(
		Object.assign(
			{
				buildPath,
			},
			...["appname", "gitpath", "servepath","index"].map((key) => ({
				[key]: path.normalize(ctx.request.body[key] || ""),
			}))
		)
	);

	let clonePath = ctx.request.body.clonePath || "";

	configs[config.appname] = config;
	if (clonePath) {
	}
	console.log(config);
	console.log("Cloning:", clonePath);

	await Sabbo(config, undefined, clonePath);
	ctx.body = "done";
	await next();
});

router.get("/demos/:appname/:blob?", async (ctx, next) => {
	let { blob, appname } = ctx.params;
	let config;
	try {
		config = configs[appname];
		if (!config) throw Error("Route doesn't exist");
	} catch {
		ctx.body = 404;
	}
	if (!blob) blob = await Sabbo.blob("master", "HEAD");

	let clonepath = path.join(appname,blob)
	let repo;
	if (!fse.existsSync(clonepath))
		repo = await Sabbo.initializeSrc(config, clonepath);
	else repo = Sabbo.open(clonepath);
	console.log(await path.relative(path.resolve("."), clonepath));
    await send(ctx, await path.relative(path.resolve("."), clonepath),{index: config.index});

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
