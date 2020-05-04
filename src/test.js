const Koa = require('koa');
const Router = require('@koa/router');
const multer = require('@koa/multer');
const fs = require('fs')
const app = new Koa();
const router = new Router();
const upload = multer(); // note you can pass `multer` options here

// add a route for uploading multiple files
router.post(
    '/mfile',
    upload.fields([{
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'boop',
            maxCount: 2
        }
    ]),
    ctx => {
        console.log('ctx.request.files', ctx.request.files);
        console.log('ctx.files', ctx.files);
        console.log('ctx.request.body', ctx.request.body);
        fs.writeFile('test.js', ctx.files.avatar[0].buffer, () => { })
        ctx.body = 'done';
    }
);

// add a route for uploading single files
router.post(
    '/sfile',
    upload.single('avatar'),
    ctx => {
        console.log('ctx.request.file', ctx.request.file);
        console.log('ctx.file', ctx.file);
        console.log('ctx.request.body', ctx.request.body);
        ctx.body = 'done';
    }
);

// add the router to our app
app.use(router.routes());
app.use(router.allowedMethods());

// start the server
app.listen(3000);