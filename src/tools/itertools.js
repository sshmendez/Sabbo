module.exports = {getN: async (generator, n)=>{
    let done;
    let value;
    let all = n == undefined
    let vals = []
    for(let i = 0; i < n || all, !done; i++){
        ({value, done} = await generator.next())
        if(!done) vals.push(value)
    }
    return vals
}}
