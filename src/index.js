const Koa = require("koa");
const Router = require("@koa/router");
const koaBody = require("koa-body")({ multipart: true });
const app = new Koa();
const router = new Router();
const path = require("path");
const servestatic = require("koa-static");
const { Sabbo } = require(path.resolve(__dirname, "./system"));
// add a route for uploading multiple files

routemap = {};
const staticroutes = {};
const configfile = "../build/build.conf";
let addRouter = function (routemap) {
    return async (ctx, next) => {
        let { config } = ctx.sabbo
        let { appname } = config
        console.log(appname)
        if (routemap[appname]) {
            ctx.body = "already exists";
        } else {
            if (appname.indexOf("..") > -1) {
                ctx.body("cannot create directory: " + appname);
            }
            let sabbo = new Sabbo(config);
            sabbo.create();
            routemap[appname] = sabbo;
        }
        await next()
    };
};
router.post("/create", koaBody, async (ctx, next) => {
	// console.log("ctx.request.files", ctx.request.files);
	// console.log("ctx.request.body", ctx.request.body);
    let appname = path.normalize(ctx.request.body.appname);
    ctx.sabbo = {}
    ctx.sabbo.config = { appname };
    console.log(ctx.sabbo)
	await next();
}, addRouter(routemap));

router.post("/addroute", koaBody, (ctx, next) => {
	let route = ctx.request.body.route;
	debugger;
	console.log(route);
	routemap[route] = async (ctx) => {
		ctx.body = ctx.params;
	};
	ctx.body = route;
	next();
});
router.get("/demos/:appname/:blob?", async (ctx, next) => {
	let route;
	try {
		route = routemap[ctx.params.appname];
		if (!route) throw Error("Route doesn't exist");
		await route(ctx, next);
	} catch {
		ctx.body = 404;
    }
    
    let { blob, appname } = ctx.params
    let branch, commit;
    if(blob)
        ({ branch, commit } = Sabbo.parseBlob(blob))
    else
        [branch,commit] = ['master','HEAD']
	let path = route.getPath({branch,commit});
	console.log("serving " + path);
    let staticroute = servestatic(path)
    staticroute(ctx, async () => { console.log('calling next') })
    staticroutes[ctx.params.appname] =  staticroute
	await next();
});
// add the router to our app
app.use(async (ctx, next) => {
	console.log(ctx.path);
	let query = ctx.path.split("/");
	if (query[0] == "demos") {
		let [appname, blob] = query;
	}
	await next();
});
app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
	console.log("finishing request");
	await next();
});

console.log("starting: ");
// start the server
app.listen(3000);
``;
