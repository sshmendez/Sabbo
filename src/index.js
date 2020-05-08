const Koa = require("koa");
const Router = require("@koa/router");
const koaBody = require("koa-body")({
    multipart: true
});
const app = new Koa();
const router = new Router();
const path = require("path");
const servestatic = require("koa-static");
const {
    Sabbo
} = require(path.resolve(__dirname, "./system"));
// add a route for uploading multiple files

routemap = {};
const staticroutes = {};
const configfile = "../build/build.conf";

let addRouter = function (routemap) {
    return async (ctx, next) => {
        let config = ctx.sabbo.config
        let appname = config.appname
        console.log(appname)
        if (routemap[appname]) {
            ctx.body = "already exists";
        } else {
            if (appname.indexOf("..") > -1) {
                ctx.body("cannot create directory: " + appname);
            }
            Sabbo(config, false);
            routemap[appname] = config;
        }
        await next()
    };
};
router.post("/create", koaBody, async (ctx, next) => {
    // console.log("ctx.request.files", ctx.request.files);
    // console.log("ctx.request.body", ctx.request.body);
    let config = {
        appname: '',
        gitpath: '',
        servepath: ''
    }
    Object.keys(config).forEach(
        (key) => config[key] = path.normalize(ctx.request.body[key] || '')
    )

    ctx.sabbo = {}
    ctx.sabbo.config = Sabbo.buildConfig(config)
    console.log(ctx.sabbo)
    await next();
}, addRouter(routemap));

router.post("/addroute", koaBody, (ctx, next) => {
    let route = ctx.request.body.route;
    console.log(route);
    routemap[route] = Sabbo.buildConfig({ appname: route })
    ctx.body = 'route'
    next();
});
router.get("/demos/:appname/:blob?", async (ctx, next) => {
    let config;
    try {
        config = routemap[ctx.params.appname];
        if (!route) throw Error("Route doesn't exist");
    } catch {
        ctx.body = 404;
    }

    let {
        blob,
        appname
    } = ctx.params
    if (!blob)
        blob = Sabbo.blob('master', 'HEAD')
    let path = Sabbo.getPath(config, blob);

    console.log("serving " + path);
    let staticroute = servestatic(path)
    staticroute(ctx, async () => {
        console.log('calling next')
    })
    staticroutes[ctx.params.appname] = staticroute
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