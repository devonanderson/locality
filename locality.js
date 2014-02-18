var fs 			= require('fs')
,	_ 			= require('underscore')
,	mustache 	= require('mustache')
,	locale 		= require('locale')
,	sprintf 	= require('sprintf-js').vsprintf
,	yaml 		= require('js-yaml');

function Locality(opts) {

	var defaults = {
		path		: __dirname + '/packs'
	,	locale 		: 'en_US'
	,	supported 	: ['en_US']
	,	cookie 		: 'lang'
	};

	if(typeof opts === 'object' && opts instanceof Locality) {
		this.settings 	= _.extend({}, opts.settings);
		this.supported 	= new locale.Locales(opts.settings.supported);
		this.lang 		= _.extend({}, opts.lang);
	}
	else {
		this.settings 	= _.extend(defaults, opts);
		this.supported 	= new locale.Locales(this.settings.supported);
		this.lang 		= this.loadLanguagePack();
	}

	this.setLocale(this.settings.locale);
}

Locality.prototype.loadLanguagePack = function () {

	var lang = {};
		
	try {
		var dirs = fs.readdirSync(this.settings.path);
	} 
	catch (e) {
		console.error('Locality: Could not read language pack directory: ' + this.settings.path);
		throw e;
	}
	
	for(var i = 0; i < dirs.length; i++) {

		try {
			var isDir = fs.lstatSync(this.settings.path + '/' + dirs[i]).isDirectory();
		}
		catch (e) {
			console.error('Locality: Could not read language pack directory: ' + this.settings.path);
		}

		if(isDir) {

			var locale 		= dirs[i].toLowerCase();
			lang[locale] 	= {};

			try {
				var definitions = fs.readdirSync(this.settings.path + '/' + dirs[i]);
			} 
			catch (e) {
				console.error('Locality: Could not read language pack directory: ' + this.settings.path);
				throw e;
			}

			for(var j = 0; j < definitions.length; j++) {
		
				if(definitions[j].indexOf('.yml') == -1) continue;
				
				try {
					var langDef = yaml.safeLoad(fs.readFileSync(this.settings.path + '/' + dirs[i] + '/' + definitions[j], 'utf8'));
				} 
				catch(e) {
					console.error('Locality: Language definition: ' + definitions[j] + ' contains errors. Skipping.');
					console.error(e);
					continue;
				}

				lang[locale] = _.extend(lang[locale], langDef);
			}
		}
	}

	return lang;
}

Locality.prototype.getArgs = function (args, plural) {
	
	var args 	= Array.prototype.slice.call(args, 0)
	,	key  	= args.shift()
	,	count 	= null;

	if(plural) {
		count = args.pop();
	}

	nArgs = {};

	_.each(_.filter(args, function (arg) {
		return typeof arg === 'object';
	}), 
	function (arg) {
		_.extend(nArgs, arg);
	});

	sArgs = _.reject(args, function (arg) {
		return typeof arg === 'object';
	});

	return {
		key		: key
	,	named	: nArgs
	,	string	: sArgs
	,	count 	: count
	};
}

Locality.prototype.translate = function (string, args) {

	if((/{{.*}}/).test(string) && !_.isEmpty(args.named)) {
		string = mustache.render(string, args.named);
	}

	if((/%/).test(string) && args.string.length > 0) {
		string = sprintf(string, args.string);
	}

	return string;
}

Locality.prototype.setLocale = function(loc) {
	if (typeof loc === 'string') {
		this.settings.locale = loc.toLowerCase();
	}
}

Locality.prototype.setLocaleFromReq = function (req) {
	if(req && req.headers && req.headers['accept-language']) {
   		var locales = new locale.Locales(req.headers['accept-language']);
   		
   		this.setLocale(locales.best(this.supported));
	}
}

Locality.prototype.setLocaleFromCookie = function (req) {
	if (req && req.cookies && req.cookies[this.cookie]) {
		var locales = new locale.Locales(req.cookies[this.cookie]);
		
		this.setLocale(locales.best(this.supported));
	}
}

Locality.prototype.setLocaleFromQuery = function (req) {
	if (req && req.query && req.query.lang) {
		var locales = new locale.Locales(req.query.lang);
		
		this.setLocale(locales.best(this.supported));
	}
}

Locality.prototype.setLocaleFromSubdomain = function (req) {
	if (req && req.headers && req.headers.host && /^([^.]+)/.test(req.headers.host)) {
		var locales = new locale.Locales(RegExp.$1);
		
		this.setLocale(locales.best(this.supported));
	}
}

Locality.prototype.getLocale = function () {
	return this.settings.locale;
}

Locality.prototype.__ = function () {

	var args = this.getArgs(arguments, false);

	if(!this.lang[this.settings.locale] || !this.lang[this.settings.locale][args.key]) return;
	if(typeof string === 'object') string = string.singular;

	var string = this.lang[this.settings.locale][args.key];

	if(string === '') {
		string = args.key;
	}

	return this.translate(string, args);
}

Locality.prototype.__p = function () {

	var args = this.getArgs(arguments, true);

	if(!this.lang[this.settings.locale] || !this.lang[this.settings.locale][args.key]) return;

	var string = this.lang[this.settings.locale][args.key].plural;

	if(args.count === 1) {
		string = this.lang[this.settings.locale][args.key].singular;
	}

	return this.translate(string, args);
}

Locality.prototype.middleware = function () {

	var self = this;

	return function (req, res, next) {

		req.locality = new Locality(self);
		next();
	}
}

exports = module.exports = Locality;