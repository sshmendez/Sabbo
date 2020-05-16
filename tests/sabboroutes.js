const path = require('path')

const local = path.resolve.bind(__dirname,'src')

const { Sabbo } = require(local('system.js'));
const Routes = require(local("tools/routes.js"));
const buildpath = local('../build')

let appname = 'testname'
let clonepath = local('..')
console.log(clonepath)
Sabbo.cleanup({buildpath}, true)
let run = (async ()=>{
    try{
        await Routes.create({buildpath, appname, clonepath},true)
        await Routes.getWorktree({buildpath, appname})
    }
    catch(err){ 
        console.log(err)
    }
})()