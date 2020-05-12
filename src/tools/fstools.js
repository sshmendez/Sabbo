const path = require('path')
const fs = require('fs-extra')
module.exports = {
    deleteFolderRecursive(dirpath) {
        if (fs.existsSync(dirpath)) {
            fs.readdirSync(dirpath).forEach((file, index) => {
                const curPath = dirpath.join(dirpath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    // recurse
                    deleteFolderRecursive(curPath);
                } else {
                    // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(dirpath);
        }
    },
    mkdirs(dirpath) {
        let p = '/'
        let dirs = dirpath.split('/')
        dirs.forEach(dir => {
            p = path.join(p, dir)
            if (!fs.existsSync(p))
                fs.mkdir(p)
        })
    }
}