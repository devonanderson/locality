Locality
========

Locality adds i18n support to [Express](http://github.com/visionmedia/express). It exposes middleware that can be added to the Express middleware stack. 

Locality uses YAML configuration files to define it's language packs. 

##Definitions

First you must define your language packs. Language packs are directories named after the locale they are supporting, each file inside a locale directiory defines a namespace and each key within that namespace is a localized string.

```
/packs //The default language pack directory
en_US/default.yml //en_US is the locale and bar is the namespace

Hello {{name}}: 'Hello {{name}}'' //Locality supports Handlebars variables
//Locality supports pluralization
I ate %s duck:
	0: 'I ate no ducks' //You can provide number based keys which Locality will look for first, this helps with languages like Russian that have multiple types of pluralization
	singular: 'I ate %s duck' //Locality supports string formatting with sprintf-js
	plural: 'I ate %d ducks'

en_US/foo.yml

bar %s: 'bar %s'
```

##Instantiation

You should instantiate Locality in your ```app.js```, it should be done before you set Express' middleware.

```
var Locality = require('locality'),
	i18n = new Locality({
		path: './packs', //The path to the language packs directory
		defaultLocale: 'en_US', //The default locale
		defaultFile: 'default.yml' //The default file to use when translating strings
		locales: ['en_US'] //The supported locales, expects an array of locale strings
	});
```

Pass the Locality middleware anywhere in the middleware chain you want.

```
app.use(i18n.middleware());
```

##Usage

The Locality object is attached to the Express' ```req``` object 

```
var route = function (req, res, next) {
	
	req.i18n //The Locality object

	req.i18n.setLocale('en_US'); //Manually set the locale
	req.i18n.setLocaleFromHeaders(req.headers); //Set the locale from the 'accept-language' headers
	req.i18n.setLocaleFromCookie(req.cookies, 'lang');//Set the locale from the cookie, the second arg is the key to look for
	req.i18n.setLocaleFromQuery(req.query, 'lang'); //Set the locale from the query/body, the second arg is the key to look for
	req.i18n.setLocaleFromSubdomain(req.headers.host); //Set the locale from the subdomain of the url string

	req.i18n.getLocale(); //Returns the current locale

	//Translation for a single string
	req.i18n.__('Hello {{name}}', { name: 'Devon Anderson' }); //Looks in the default file (default.yml) returns Hello Devon Anderson
	req.i18n.__('foo.yml', 'bar %s', 'baz'); //Looks in foo.yml and returns bar baz

	//Pluralized translations, definitions needs to have a "singular" and "plural" set of keys, and can provide options number based keys.
	req.i18n.__p('I ate %s duck', 0); //I ate no ducks
	req.i18n.__p('I ate %s duck', 2); //I ate 2 ducks
	req.i18n.__p('I ate %s duck', 'a', 1); //I ate a duck
}
```
