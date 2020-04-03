const express = require('express');
const path = require('path');
const app = new express();

const server = require('http').createServer(app);

const webpack = require('webpack');
const webpackConfig = require('./webpack.config.dev.js');
const compiler = webpack(webpackConfig);

app.use(
  require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: '/',
  })
);

app.use(require('webpack-hot-middleware')(compiler));

app.use('/', express.static(path.join(__dirname, 'resources')));

server.listen(5557);
console.log(`Simulator started at port 5557...`);
