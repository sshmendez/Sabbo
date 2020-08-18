# Sabbo

A webserver built to leverage git version history, built primarily to serve webpages

## What it does

Sabbo serves files from any branch and any commit in a git repository.
By default Sabbo serves files from the head commit on the master branch and provides endpoints for each branch and commit 

## How it works

I used node-git to generate worktrees for requested commits and koa to then serve those files

## Use cases

A-B Testing: show users versions of a website from 2 different branches

Development: compare past version of your website

Continuous Integration: Sabbo automatically updates its files to reflect changes in the git repo. That means Sabbo always serves the most up to date version of your website
