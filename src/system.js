const fse = require("fs-extra");
const fstools = require("./tools/fstools.js")
const Git = require("nodegit");
const path = require("path");
const GitHelpers = require("./tools/GitHelpers.js")
const alphanum = /^[a-z0-9]+$/i;
deprecationWarning =
    process.env.NODE_ENV !== "production" ? console.warn : () => {};
async function Sabbo(config, override, cloneUrl) {
    if (override != undefined) deprecationWarning('override will be removed')
    let gitpath = config.gitpath
    let repo;
    if (!cloneUrl) {
        repo = await Git.Repository.init(gitpath, 1);
    } else {
        repo = await Git.Clone(cloneUrl, gitpath, {
            bare: 1
        })
        GitHelpers.trackAll(repo)
    }

    fstools.mkdirs(config.servepath)

    fse.writeFile(path.join(config.buildPath, Sabbo.canRemovePath), 1)
    fse.writeFile(path.join(config.gitpath, Sabbo.canRemovePath), 1)
    fse.writeFile(path.join(config.servepath, Sabbo.canRemovePath), 1)
    return repo
}

login = function (user, pass) {
    return {
        role: "admin",
        user,
        pass,
    };
};

Sabbo.canRemovePath = 'remove.sabbo'
Sabbo.canRemove = function (desiredPath) {
    return fse.existsSync(path.join(desiredPath, Sabbo.canRemovePath))
}

Sabbo.buildConfig = function (config) {
    config = Object.assign({}, config)
    // console.log(config)
    let buildpath = config.buildpath || path.resolve("build");
    build = path.join.bind(path, buildpath)
    gitpath = `git/${config.appname}`;
    servepath = `www/${config.appname}`;

    Object.assign(config, {
        buildpath: build(),
        gitpath: build(gitpath),
        servepath: build(servepath),
    })


    return config
}
Sabbo.initializeSrc = async function (config, clonepath) {
    const {
        gitpath,
        servepath,
        commitid
    } = config
    // console.log(servepath)
    // console.log(clonepath)
    return Git.Clone(gitpath, clonepath, {
        fetchOpts: {
            callbacks: {
                certificateCheck: function () {
                    // github will fail cert check on some OSX machines
                    // this overrides that check
                    return 0;
                },
            },
        },
    })  
}
Sabbo.getPath =  function (config,blob) {
    return path.join(config.servepath, blob)
}
Sabbo.parseBlob = async function (blob) {
    return {
        branch: "master",
        commit: "",
    };
};
/**
 * Allow config to pass a blob or the branch and commit
 * if branch exists, blob is ignored
 * 
 * this is a helper function, and will only function on a single machine system
 */
Sabbo.blob = async function () {
    let raw = Object.values(arguments).filter((val) => !!val)
    return raw.join('1')
    blob = new Buffer
        .from(JSON.stringify({
            appname,
            branch,
            commit
        }))
        .toString("base64");



}
Sabbo.open = async function (servepath) {
    return 8
}

Sabbo.cleanup = async function (config, scratch) {
    // console.log(config, scratch)
    if (scratch) {
        if (Sabbo.canRemove(config.buildPath))
            fse.remove(config.buildPath)
    } else {
        Sabbo.cleanLocalBare(config)
        Sabbo.cleanWorking(config)
    }
}
Sabbo.cleanLocalBare = async function ({
    gitpath
}) {
    if (Sabbo.canRemove(gitpath))
        fse.remove(gitpath)
}

Sabbo.cleanWorking = async function (config, blobs) {
    if (blobs)
        blobs = blobs instanceof Array ? blobs : [blobs]
    else
        blobs = ''
    blobs.forEach(blob => {
        let worktree = Sabbo.getPath(config, blob)
        if (Sabbo.canRemove(worktree))
            fse.remove(worktree)
    })

}
Sabbo.addRoute = function (router, route) {
    router.use(route, (ctx, next) => {
        ctx.body = "added route";
        next();
    });
};
Sabbo.validDir = async function (dirname) {
    return alphanum.test(dirname);
};

module.exports = {
    login,
    Sabbo,
};