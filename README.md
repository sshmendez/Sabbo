# Sabbo

A webserver built to leverage git version history

## What it does

Sabbo serves files from any branch and any commit in a git repository.
By default Sabbo serves files from the git repo and provides endpoints for each branch and commit 

## How it works

I used node-git to generate worktrees for requested commits and koa to then serve those files
