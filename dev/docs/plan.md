# vision
Client Website
    login -> website

system
    db client websites
    client login -> token (authorized sites)
    example.com/website -> WORKS!

## functions
    login(user,pass):
        jwt token (header, json, signature)

    add(files):
        create src
        add files to src
        implement a koa server
        mount server to an endpoint


<pre>
login
----->[login]
<----- jwt
ex.com/example
------------------->[interface]---------->[example webserver]
                                validate

add:
    --------------->[interface]---------->[example webserver]
                               ---------->[example2 webserver]
</pre>