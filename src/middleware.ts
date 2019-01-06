import express = require('express'); 

import {UserDB} from '../secret/secret'
import {logger} from './logger';

export const auth:express.Handler = (req, res, next) => {
  if (!req.session){
    return res.status(500).send("Session should be defined.")
  }
  if(req.body.login && req.body.pwd){
    if(req.body.login in UserDB){
      if(UserDB[req.body.login] === req.body.pwd){
        if (req.session){
          req.session.authed = {
            login:req.body.login
          }
          logger.info(`${req.session.authed.login} : just got authed`)
          return res.redirect("/search")
        }
      } else if (req.session){
        req.session.authed = undefined
        logger.info(`${req.body.login} : cred error`)
        return res.redirect("/login?wrong_cred=1")
      }
    } else if (req.session){
      req.session.authed = undefined
      logger.info(`${req.body.login} : cred error`)
      return res.redirect("/login?wrong_cred=1")
    }
  }
  if(req.session.authed){
    logger.info(`${req.session.authed.login} authed`)
    return next()
  }
  return res.redirect("/login")
}