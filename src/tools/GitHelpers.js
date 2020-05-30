let Git = require('nodegit')
let path = require('path')

module.exports = {
    parseRelativeCommit(commitstring){
        let parts = commitstring.split('~');
        if(parts[0] != 'HEAD') throw Object.assign(Error(), {name: 'CommitParseError', message: 'Unable to parse '+commitstring});
        let delta = parts[1] || 0;
        return delta

    },
    async relativeCommit(repo, delta){
        if(typeof delta === 'string') delta = this.parseRelativeCommit(delta) 
        if(delta != 0) throw Error('Currently Not Implemented')
        return repo.getHeadCommit()
    },
    async relativeBranchCommit(repo, branchname, delta){
        let currentBranch = await repo.getCurrentBranch()
        currentBranch = currentBranch.name()
        let refname;
        try{
            refname = await repo.getReference(branchname)
            refname = refname.name()
        }
        catch(err){
            refname = branchname
        }

        await repo.setHead(refname)
        let err;
        let commit;
        try{
            commit = await this.relativeCommit(repo,delta)
        }
        catch(e){
            err = e
        }

        await repo.setHead(currentBranch)
        if(err) throw err
        return commit
    },
    async trackRemoteBranch(repo, remotename, branchname) {

        let remote_path = path.join(remotename, branchname);
        let branch_commit = await repo.getBranchCommit(remote_path);
        let branch_ref;
        try{
            branch_ref = await repo.createBranch(branchname, branch_commit);
        }
        catch(err){
            /**
             * Branch Exists
             */
            if(err.errno != -4) throw err;
            branch_ref = await repo.getBranch(branchname);
        }
        await Git.Branch.setUpstream(branch_ref, remote_path);
        return true;

    },
    /**
     * refs/remotes/origin/master =>
     * {
     *  remotename: origin,
     *  branchname: master,
     * }
     *  Todo: find more universal solution, 
     *  Not sure if this is always the ref name structure
     */
    cleaveRef(remote_ref) {
        let parts = remote_ref.split('/')
        let [remotename, branchname] = parts.slice(parts.length - 2)
        return {
            remotename,
            branchname
        }
    },
    /**
     * Throws error if written like: (await getRefs()).filter
     * "Unable to lock file for writing..."
     */
    async getLocalReferences(repo){
        let refs =  await repo.getReferences()
        let locals = refs.filter(ref=>!ref.isRemote())
        return locals
    },
    async getRemoteReferences(repo) {
        let refs = await repo.getReferences()
        let remote_refs = refs
            .filter((ref) => ref.isRemote())
        return remote_refs
    },
    /**
     * Todo: handle exceptions or neatly allow them
     * I haven't encountered any serious errors up to this point
     */
    async trackAll(repo) {
        let cleaved = (await this.getRemoteReferences(repo))
            .map(ref => ref.name())
            .map(ref => this.cleaveRef(ref))
        let track = (async ({remotename, branchname}) => {
                try {
                    await this.trackRemoteBranch(repo, remotename, branchname);
                } catch (err) {
                    console.log(err);
                }
            })
        for(ref of cleaved){
            await track(ref)
        }
        return true
    },
    /**
     * provides a generator to iterate over commits
     * Revwalkers take a starting point before they begin walking
     * that starting point is commitish; either a commit obj, oid, or oid-string
     * 
     * @param commitconfig 
     * {
     *  refname: valid ref in repo
     *  oid: valid commit oid in repo
     * }
     * the walker starts from either 
     *  oid, refname.head; checking in that order
     * if neither is specified the repos head commit is used
     */
    async *getCommits(repo,commitconfig) {
        let {refname, oid} = commitconfig || {};

        let walk = repo.createRevWalk();
        if(oid) walk.push(oid)
        else if(refname) walk.pushRef(refname);
        else walk.push((await repo.getHeadCommit()));
        do{
            let oid;
            try{
                oid = await walk.next();
            }
            catch(err){
                return
            }
            yield await repo.getCommit(oid);

        }
        while(true);

    },
    /**
     * probably creating tools/itertools 
     */
    async getN(generator, n){
        let done;
        let value;
        let all = n == undefined
        let vals = []
        for(let i = 0; i < n || all, !done; i++){
            ({value, done} = await generator.next())
            if(!done) vals.push(value)
        }
        return vals
    },
    /**
     *  depreciating
     */
    async getNCommits(repo, {oid, refname, nCommits}){
        process.emitWarning('getNCommits will soon be removed from GitHelpers'+
         'please stop using it to avoid failures in the future')
		let comgen = GitHelpers.getCommits(repo, {oid, refname})
		return await GitHelpers.getN(comgen, numCommits)

    }
    /**
     * Provides a generator to iterate over refs
     */

    
}