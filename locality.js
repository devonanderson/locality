var fs = require('fs')
,		mustache = require('mustache')
,		locale = require('locale')
,		sprintf = require('sprintf-js').vsprintf
,		yaml = require('js-yaml')
,		cookie = require('cookie');

function Locality(opts) {
	var defaults = {
			path: __dirname + '/packs'
	,		defaultLocale: 'en_US'
	,		defaultFile: 'default.yml'
	,		locales: ['en_US']
	};

	this.settings = opts || {};

	for(var i in defaults) {
		this.settings[i] = this.settings[i] || defaults[i];
	}

	locale.Locale['default'] = new locale.Locale(this.settings.defaultLocale);

	this.supportedLocales = new locale.Locales(this.settings.locales);
	this.catalog = this._loadLanguagePack();
}

Locality.prototype._loadLanguagePack = function () {
	var lang = {};
		
	try {
		var dirs = fs.readdirSync(this.settings.path);
	} 
	catch (e) {
		console.error('Locality: Could not read language pack directory ' + this.settings.path);
		throw e;
	}
	
	for(var i = 0; i < dirs.length; i++) {
		try {
			var isDir = fs.lstatSync(this.settings.path + '/' + dirs[i]).isDirectory();
		}
		catch (e) {
			console.error('Locality: Could not read language pack directory ' + this.settings.path + '/' + dirs[i]);
		}

		if(isDir) {
			var locale = dirs[i];
			lang[locale] = {};

			try {
				var definitions = fs.readdirSync(this.settings.path + '/' + dirs[i]);
			} 
			catch (e) {
				console.error('Locality: Could not read language pack directory ' + this.settings.path + '/' + dirs[i]);
				throw e;
			}

			for(var j = 0; j < definitions.length; j++) {
				if(definitions[j].indexOf('.yml') == -1) continue;
				
				try {
					var langDef = yaml.safeLoad(fs.readFileSync(this.settings.path + '/' + dirs[i] + '/' + definitions[j], 'utf8'));
				} 
				catch(e) {
					console.error('Locality: Language definition file ' + this.settings.path + '/' + dirs[i] + '/' + definitions[j] + ' contains errors. Skipping...');
					console.error(e);

					continue;
				}

				var key = definitions[j].replace('.yml', '');

				lang[locale][key] = langDef;
			}
		}
	}

	return lang;
}

Locality.prototype._arguments = function (args, plural) {
	var file
	,		key
	,		count = 1
	,		object
	,		format;

	args = Array.prototype.slice.call(args, 0);
	file = args.shift();

	if(file.indexOf('.yml') > -1) {
		key = args.shift();
	}
	else {
		key = file;
		file = this.settings.defaultFile;
	}

	if(plural && typeof args[args.length - 1] === 'number') {
		count = args.pop();
	}

	if(!args.length) {
		format = [count];
	}
	else if(typeof args[0] === 'object') {
		object = args[0];
	}
	else {
		format = args;
	}

	return {
		file: file.replace('.yml', '')
	,	key: key
	,	object: object
	,	format: format
	,	count: count
	};
}

Locality.prototype._translate = function (string, args) {
	if((/{{.*}}/).test(string) && args.object) {
		string = mustache.render(string, args.object);
	}

	if((/%[Sscfdi0-9]/).test(string) && args.format) {
		string = sprintf(string, args.format);
	}

	return string;
}

Locality.prototype.setLocale = function(loc) {
	var locales = new locale.Locales(loc);

	this.currentLocale = locales.best(this.supportedLocales);
}

Locality.prototype.setLocaleFromHeaders = function (req) {
	if(req.headers['accept-language']) {
   	this.setLocale(req.headers['accept-language']);
	}
}

Locality.prototype.setLocaleFromCookie = function (req, key) {
	var headers = req.headers
	,		locale = (headers.secureCookie && cookie.parse(headers.secureCookie)[key]) 
							|| (headers.signedCookie && cookie.parse(headers.signedCookie)[key])
							|| (headers.cookie && cookie.parse(headers.cookie)[key]);

	if(locale) {
		this.setLocale(locale);
	}
}

Locality.prototype.setLocaleFromQuery = function (req, key) {
	if (req.query[key]) {
		this.setLocale(req.query[key]);
	}
}

Locality.prototype.setLocaleFromSubdomain = function (domain) {
	if (domain) {
		domain = domain.replace(/(http:\/\/|https:\/\/)/, '');

		if(/^([^.]+)/.test(domain)) {
			this.setLocale(locales.best(RegExp.$1));
		}
	}
}

Locality.prototype.getLocale = function () {
	return this.currentLocale;
}

Locality.prototype.isLocaleSupported = function (loc) {
	return this.supportedLocales.indexOf(loc) > -1;
}

Locality.prototype.__ = function () {
	var args = this._arguments(arguments, false)
	,		locale = this.getLocale()
	,		file = args.file
	,		key = args.key;

	if(!this.catalog[locale] || !this.catalog[locale][file] || !this.catalog[locale][file][key]) return;
	
	var string = this.catalog[locale][file][key];

	if(typeof string === 'object') {
		string = string.singular;
	}

	return this._translate(string, args);
}

Locality.prototype.__p = function () {
	var args = this._arguments(arguments, true)
	,		locale = this.getLocale()
	,		file = args.file
	,		key = args.key;

	if(!this.catalog[locale] || !this.catalog[locale][file] || !this.catalog[locale][file][key]) return;

	var string = this.catalog[locale][file][key].plural;

	if(args.count === 1) {
		string = this.catalog[locale][file][key].singular;
	}

	return this._translate(string, args);
}

Locality.prototype.middleware = function () {
	var self = this;

	return function (req, res, next) {
		
		req.i18n = self;
		next();
	}
}

exports = module.exports = Locality;