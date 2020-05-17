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
    fse.writeFile(path.join(config.buildpath, Sabbo.canRemovePath), 1)
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
/**
 * The removal checks should not be relied on
 * This was primarily added for testing
 * 
 * more stable and secure options include 
 *  running this in a docker instance
 *  running as a user with reduced privileges
 * 
 * be careful using this, it shouldn't be exposed to an api
 */
Sabbo.remove = function(removePath){
    if(Sabbo.canRemove(removePath)){
        fse.removeSync(removePath)
    }
}

Sabbo.gitpath = function(buildpath, appname){
    return path.join(buildpath,`git/${appname}`)
}
Sabbo.servepath = function(buildpath, appname, blob){
    blob = blob || ''
    appname = appname || appname
    return path.join(buildpath,`www/${appname}`,blob)
}

Sabbo.buildConfig = function (config) {
    config = Object.assign({}, config)
    if(!config.appname) throw {message: 'Appname must exist', name: 'AppnameException'}
    let buildpath = config.buildpath || path.resolve("build");
    build = path.join.bind(path, buildpath)
    gitpath = Sabbo.gitpath(buildpath, config.appname);
    servepath = Sabbo.servepath(buildpath, config.appname);

    Object.assign(config, {
        buildpath: build(),
        gitpath,
        servepath,
    })


    return config
}
Sabbo.exists = function(buildpath,appname, blob){
    if(blob){
        return fse.existsSync(Sabbo.servepath(buildpath,appname,blob))
    }
    console.log(Sabbo.gitpath(buildpath,appname))
    return fse.existsSync(Sabbo.gitpath(buildpath,appname)) 

}
Sabbo.initializeWorktree = async function (buildpath, appname, clonename, {branchname, commitid}) {
    let gitpath = Sabbo.gitpath(buildpath, appname)
    let clonepath = Sabbo.servepath(buildpath, appname, clonename)
    let repo;
    try{
        repo = await Git.Clone(gitpath, clonepath, {
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
    catch(err){
        if(err.errorFunction == 'Clone.clone'){
            let e = Error('Cloning '+appname+' failed')
            e.name = 'CloneError'
            throw e
        }
        throw err
    }

    return repo
  
}
Sabbo.getpath =  function (blob) {
    return path.join(Sabbo.servepath(), blob)
}
Sabbo.parseBlob = function (blob) {
    let sect = blob.split('1')
    return {
        branchname: sect.pop(),
        commitid: sect.pop(),
    };
};
/**
 * Allow config to pass a blob or the branch and commit
 * if branch exists, blob is ignored
 * 
 * this is a helper function, and will only function on a single machine system
 */
Sabbo.blob =  function () {
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
Sabbo.open = async function (buildpath, appname, blob) {

    return Git.Repository.open(Sabbo.servepath(buildpath, appname, blob))
}

Sabbo.cleanup = async function (config, scratch) {
    if (scratch) {
        Sabbo.remove(config.buildpath)
    } else {
         Sabbo.cleanLocalBare(config)
         Sabbo.cleanWorking(config)
    }
}
Sabbo.cleanLocalBare = function ({
    gitpath
}) {
    Sabbo.remove(gitpath)
}

Sabbo.cleanWorking = function (config, blobs) {
    if (blobs)
        blobs = blobs instanceof Array ? blobs : [blobs]
    else
        blobs = []
    blobs.forEach(blob => {
        let worktree = Sabbo.getPath(config, blob)
        Sabbo.remove(worktree)
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