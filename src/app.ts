import express = require('express');
import session from 'express-session';
import bodyParser from 'body-parser';
import asyncHandler from 'express-async-handler'
import {searchApi, EnrichedTorrent} from './torrent_search_api'
import path from 'path'
import serveIndex from 'serve-index'
import serveStatic from 'serve-static'

import {auth} from './middleware';
import {logger} from './logger';

const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// session
app.use(session({
  secret: 'sessionmdplol',
  resave: true,
  saveUninitialized: false
}));

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use((req,_,next) => {logger.info(req.url);next()})

app.use('/img', express.static('static/img'))

app.get('/login', asyncHandler(async (req, res) => {
  res.render('pages/login', {wrong_cred: req.query.wrong_cred});
}));

app.use(auth)

app.get('/', (req,res) => res.redirect('/search'))

app.get('/search', asyncHandler(async (req, res) => {
  if(req.query.q && req.query.q !== ""){
    const eTorrents = await searchApi.search(req.query.q);
    res.render('pages/search', {eTorrents, query: req.query.q});
  }else{
    res.render('pages/search', {err:req.query.err, success:req.query.success});
  }
}));

app.get('/download', (req, res) => {
  if(req.query.b64 && req.query.b64 !== ""){
    const torrent = searchApi.b64ToTor(req.query.b64)
    searchApi.download(torrent, torrent.title.replace(' ','_')+".torrent", function(err:Error,res:any){
      if(err){
        res.redirect("/search?err=Error%20while%20downloading")
      }else{
        res.redirect("/search?success=1")
      }
    });
    if(req.session)logger.info(`${req.session.authed.login} downloaded the file : ${torrent.title}`)
  }
});

app.use(
  '/downloaded', 
  serveStatic(process.env.DOWNLOAD_DIR as string), 
  serveIndex(
    process.env.DOWNLOAD_DIR as string, 
    {'icons': true}
  )
);
app.use(
  '/downloading', 
  serveStatic(process.env.DOWNLOADING_DIR as string), 
  serveIndex(
    process.env.DOWNLOADING_DIR as string, 
    {'icons': true}
  )
);

app.listen(process.env.PORT ? process.env.PORT : 3000)