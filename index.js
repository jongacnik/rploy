#!/usr/bin/env node

var Rsync = require('rsync')
var git = require('git-rev-sync')
var yesno = require('yesno')
var readPkgUp = require('read-pkg-up')
var appRoot = require('app-root-path')
var configFile = require(appRoot + '/rploy.config.js');

;(async () => {
  var config = await readPkgUp();

  // Get options from package.json
  var options = config.packageJson.rploy;

  // Try to get options from rploy.config.js if not defined in package.json
  if (!options) {
    try {
      var options = await configFile();
    } catch (e) { }
  }
  
  // Bail when no options
  if (typeof options !== 'object') {
    console.error('⚠️  No `rploy` options found in either package.json or rploy.config.js')
    return
  }

  // Handle branches option
  if ('branches' in options && typeof options.branches === 'object') {
    try {
      var branch = git.branch(process.cwd())
      var destination = options.branches[branch]
      if (destination) {
        if (typeof destination === 'object') {
          options = Object.assign(options, destination)
        } else {
          options.destination = destination  
        }
        delete options.branches
        console.log(`⚙️  Deploy branch "${branch}" to ${destination}`)
      } else {
        console.error(`⚠️  No remote path defined for the current branch "${branch}"`)
        return  
      }
    } catch (e) {
      console.error('⚠️  `rploy` is configured with the `branches` option, but this is not a git repository.')
      return
    }
  }

  // Merge options with defaults
  options = Object.assign({
    flags: 'avC',
    shell: 'ssh',
    delete: true
  }, options)

  // Dry-run
  console.log('📤 Review outgoing changes:')
  var dryrun = await new Promise((resolve, reject) => {
    Rsync
      .build(options)
      .dry()
      .execute((error, code, cmd) => {
        resolve()
      }, data => {
        console.log(data.toString('utf-8').trim())
      }, data => {
        console.log(data.toString('utf-8').trim())
      })
  })

  // Yes/No
  var proceed = await yesno({
    question: '🚚 Deploy? (y/n)'
  })

  // Deploy
  if (proceed) {
    var deploy = await new Promise((resolve, reject) => {
      Rsync
        .build(options)
        .execute((error, code, cmd) => {
          resolve()
        }, data => {
          console.log(data.toString('utf-8').trim())
        }, data => {
          console.log(data.toString('utf-8').trim())
        })
    })
  }

  return

})()