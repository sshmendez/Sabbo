const fse = require("fs-extra");
const Git = require("nodegit");
const path = require("path");
const alphanum = /^[a-z0-9]+$/i;

function Sabbo(config) {
    const { gitpath, cloneFrom } = config
    if (!cloneFrom) {
        Git.Repository.init(gitpath, 1);
    } else {
        console.log('cloning')
        Git.Clone(cloneFrom, gitpath, {
            bare: 1
        }).catch(repo => {
            console.log(repo)
        })
    }
}

login = function (user, pass) {
    return {
        role: "admin",
        user,
        pass,
    };
};

Sabbo.buildConfig = function (config) {
    config = Object.assign({}, config)
    let buildpath = config.buildpath || path.resolve("build");
    build = path.join.bind(path, buildpath)
    gitpath = config.gitpath || `git/${config.appname}`;
    servepath = config.servepath || `www/${config.appname}`;


    Object.assign(config, {
        buildpath: build(),
        gitpath: build(gitpath),
        servepath: build(servepath),
    })
    return config
}
Sabbo.create = async function ({
    branch,
    commit,
    gitpath,
    servepath
}) {
    return Git.Clone(gitpath, servepath, {
        fetchOpts: {
            callbacks: {
                certificateCheck: function () {
                    // github will fail cert check on some OSX machines
                    // this overrides that check
                    return 0;
                },
            },
        },
    }).then(async (repo) => {
        await repo.getCommit(commit)

    })
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
Sabbo.getPath = async function (config) {
    let {
        blob,
        appname,
        branch,
        commit,
        servepath,
    } = config;
    if (!branch) {
        ({
            branch,
            commit
        } = Sabbo.parseBlob(blob));
    }
    if (!blob) {
        blob = new Buffer
            .from(JSON.stringify({
                appname,
                branch,
                commit
            }))
            .toString("base64");
    }
    return path.join(servepath, blob);
};

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