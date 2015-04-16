
/**
 * Module dependencies.
 */

var express = require('express')
,		http = require('http')
,		path = require('path')
,		Locality = require('../locality.js');

var app = express()
,		bodyParser = require('body-parser')
,		methodOverride = require('method-override')

var i18n = new Locality({
	locales: ['en_US', 'fr']
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded())
app.use(methodOverride());
app.use(i18n.middleware()); //the Locality middleware is required, put it wherever you want your request to end.
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (err, req, res, next) { });

app.get('/', function(req, res) {	

	req.i18n.setLocaleFromQuery(req, 'lang');

  res.render('index', { 
  	title: 'Express',
  	greeting: req.i18n.__('Hello {{name}}', { name: 'Devon Anderson' }), 
  	file: req.i18n.__('foo.yml', 'bar %s', 'baz'),
  	zero: req.i18n.__p('I ate %s duck', 0),
  	singular: req.i18n.__p('I ate %s duck', 'a', 1),
  	plural: req.i18n.__p('I ate %s duck', 2)
  });
});

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
