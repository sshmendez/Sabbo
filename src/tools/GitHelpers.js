let Git = require('nodegit')
let path = require('path')

module.exports = {
    async trackRemoteBranch(repo, remote_name, branch_name) {

        let remote_path = path.join(remote_name, branch_name)

        let branch_commit = await repo.getBranchCommit(remote_path)
        let branch_ref;
        try{
            branch_ref = await repo.createBranch(branch_name, branch_commit)
        }
        catch(err){
            if(err.errno != -4) throw err
            branch_ref = await repo.getBranch(branch_name)
        }
        await Git.Branch.setUpstream(branch_ref, remote_path)
        return true

    },
    /**
     * refs/remotes/origin/master =>
     * {
     *  remote_name: origin,
     *  branch_name: master,
     * }
     *  Todo: find more universal solution, 
     *  Not sure if this is always the ref name structure
     */
    cleaveRef(remote_ref) {
        let parts = remote_ref.split('/')
        let [remote_name, branch_name] = parts.slice(parts.length - 2)
        return {
            remote_name,
            branch_name
        }
    },
    async getLocalReferences(repo){
        return (await repo.getReferences()).filter(ref=>!ref.isRemote())
    },
    async getRemoteReferences(repo) {
        let refs = await repo.getReferences()
        let remote_refs = refs
            .filter((ref) => ref.isRemote())
        return remote_refs
    },
    /**
     * Todo: handle exceptions or neatly allow them
     */
    async trackAll(repo) {
        (await this.getRemoteReferences(repo))
            .map(ref => ref.name())
            .map(ref => this.cleaveRef(ref))
            .forEach(async ({remote_name, branch_name}) => {
                try {
                    await this.trackRemoteBranch(repo, remote_name, branch_name)
                } catch (err) {
                    console.log(err)
                }
            })
        return true
    },
    /**
     * provides a generator to iterate over commits
     */
    async *getCommits(repo,commitconfig) {
        let {refname, oid} = commitconfig || {};

        let walk = repo.createRevWalk();
        if(refname) walk.pushRef(refname);
        else walk.push(oid || (await repo.getHeadCommit()));
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
    async getN(generator, n){
        let done;
        let value;
        let vals = []
        for(let i = 0; i < n, !done; i++){
            ({value, done} = await generator.next())
            if(!done) vals.push(value)
        }
        return vals
    },
    async getNCommits(repo, {oid, refname, nCommits}){
		let comgen = GitHelpers.getCommits(repo, {oid, refname})
		return await GitHelpers.getN(comgen, numCommits)

    }
    /**
     * Provides a generator to iterate over refs
     */

    
}