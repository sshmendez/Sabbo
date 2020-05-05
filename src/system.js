const fse = require("fs-extra");
const Git = require("nodegit");
const path = require("path");
const alphanum = /^[a-z0-9]+$/i;

async function Sabbo(config,override) {
    const { gitpath, cloneFrom } = config
    if (!cloneFrom) {
        return Git.Repository.init(gitpath, 1);
    } else {
        if (override) {
            await fse.remove(gitpath)
        }
        return Git.Clone(cloneFrom, gitpath, {
            bare: 1
        }).catch(repo => {
            console.log("repo: "+repo)
        }).then(() => {
            console.log('cloned')
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
Sabbo.initializeSrc = async function (config, blob) {
    const { gitpath, servepath, commitid } = config
    let clonepath = path.join(servepath, blob)
    console.log(servepath)
    console.log(clonepath)
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
    }).then(async (repo) => {
        // console.log('getting commit')
        // let commit = await repo.getCommit(commitid)
        // console.log('got commit')
        // console.log(commit.id)

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
Sabbo.blob = async function () {
    let raw = Object.values(arguments).filter((val)=>!!val)
    return raw.join('.')
    blob = new Buffer
         .from(JSON.stringify({
             appname,
             branch,
             commit
         }))
         .toString("base64");


    
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