var fs = require('fs')
,		_ = require('underscore')
,		mustache = require('mustache')
,		locale = require('locale')
,		sprintf = require('sprintf-js').vsprintf
,		yaml = require('js-yaml');

function Locality(opts) {

	var defaults = {
		path: __dirname + '/packs'
	,	locale: 'en_US'
	,	supported: ['en_US']
	};

	this.settings = _.extend(defaults, opts);
	this.supported = new locale.Locales(this.settings.supported);
	this.lang = this._loadLanguagePack();

	this.setLocale(this.settings.locale);
}

Locality.prototype._loadLanguagePack = function () {

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
			var locale = dirs[i];
			lang[locale] = {};

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

				var key = definitions[j].replace('.yml', '');

				lang[locale][key] = langDef;
			}
		}
	}

	return lang;
}

Locality.prototype._arguments = function (args, plural) {
	
	var args = Array.prototype.slice.call(args, 0)
	,		keyPath = args.shift().split('.')
	,		count = null
	,		object
	,		format;

	if(plural) {
		count = args.pop();
	}

	if(!args[0]) {
		format = count;
	}
	else if(typeof args[0] === 'object') {
		object = args[0];
	}
	else {
		format = args[0];
	}

	return {
		key: keyPath[0]
	,	def: keyPath[1]
	,	object: object
	,	format: format
	,	count: count
	};
}

Locality.prototype._translate = function (string, args) {

	if((/{{.*}}/).test(string) && args.object) {
		string = mustache.render(string, args.named);
	}

	if((/%[Sscfdi0-9]/).test(string) && args.format) {
		string = sprintf(string, args.format);
	}

	return string;
}

Locality.prototype.setLocale = function(loc) {
	if (typeof loc === 'string') {
		this.settings.locale = loc;
	}
}

Locality.prototype.setLocaleFromHeaders = function (headers) {
	if(headers && headers['accept-language']) {
   		var locales = new locale.Locales(headers['accept-language']);
   		
   		this.setLocale(locales.best(this.supported));
	}
}

Locality.prototype.setLocaleFromCookie = function (cookie, key) {
	if (cookie && cookie[key]) {
		var locales = new locale.Locales(cookie[key]);
		
		this.setLocale(locales.best(this.supported));
	}
}

Locality.prototype.setLocaleFromQuery = function (query, key) {
	if (query && query[key]) {
		var locales = new locale.Locales(query[key]);
		
		this.setLocale(locales.best(this.supported));
	}
}

Locality.prototype.setLocaleFromSubdomain = function (domain) {
	if (domain) {
		domain = domain.replace(/(http:\/\/|https:\/\/)/, '');

		if(/^([^.]+)/.test(domain)) {
			var locales = new locale.Locales(RegExp.$1);
			
			this.setLocale(locales.best(this.supported));
		}
	}
}

Locality.prototype.getLocale = function () {
	return this.settings.locale;
}

Locality.prototype.__ = function () {

	var args = this._arguments(arguments, false)
	,		locale = this.settings.locale
	,		key = args.key
	,		def = args.def;

	if(!this.lang[locale] || !this.lang[locale][key] || !this.lang[locale][key][def]) return;
	
	var string = this.lang[locale][key][def];

	if(typeof string === 'object') {
		string = string.singular;
	} 

	return this._translate(string, args);
}

Locality.prototype.__p = function () {

	var args = this._arguments(arguments, true)
	,		locale = this.settings.locale
	,		key = args.key
	,		def = args.def;

	if(!this.lang[locale] || !this.lang[locale][key] || !this.lang[locale][key][def]) return;

	var string = this.lang[locale][key][def].plural;

	if(args.count === 1) {
		string = this.lang[locale][key][def].singular;
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