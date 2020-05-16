let Git = require('nodegit')
let path = require('path')
module.exports = {
    async trackRemoteBranch(repo, remote_name, branch_name) {

        let remote_path = path.join(remote_name, branch_name)

        let branch_commit = await repo.getBranchCommit(remote_path)
        let branch_ref = await repo.createBranch(branch_name, branch_commit)
        await Branch.setUpstream(branch_ref, remote_path)
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
    async cleaveRef(remote_ref) {
        let parts = remote_ref.split('/')
        let [remote_name, branch_name] = parts.slice(parts.length - 2)
        return {
            remote_name,
            branch_name
        }
    },
    async getRemoteReferences(repo) {
        let refs = await repo.getReferences()
        let remote_refs = refs
            .filter((ref) => ref.isRemote())
            .map(ref => ref.name())
        return remote_refs
    },
    /**
     * Todo: handle exceptions or neatly allow them
     */
    async trackAll(repo) {
        (await this.getRemoteReferences(repo))
            .map(ref => this.cleaveRef(ref))
            .forEach(async ({remote_name, branch_name}) => {
                try {
                    await this.trackRemoteBranch(repo, remote_name, branch_name)
                } catch (err) {}
            })
        return true
    }
}