'use_strict';

var path   = require('path');
var _      = require('lodash');
_.str      = require('underscore.string');
var colors = require('colors');

var re_match_id = /<svg[^>]*id="([^"]*)"/;

var log = console.log;

var modifiers = {
	dashify: function(str) {
		return _
			.str.trim(str)
			.replace(/([A-Z])/g, '-$1')
			.replace(/[_\s]+/g, '-')
			.toLowerCase();
	}
};

exports.name   = 'mapFileNameToId';
exports.active = true;
exports.params = {
	modifier : 'dashify',
	prefix   : 'svg-',
};

exports.fn = function (svg, meta) {
	var file     = meta.file;
	var name     = path.basename(file, path.extname(file));
	var modifier = modifiers[this.params.modifier];

	var matches = svg.match(re_match_id);
	var id      = (matches) ? matches[1] : null;

	var plugin_meta = {
		id : id
	};

	if (!id) {
		id  = plugin_meta.id = this.params.prefix+modifier(name);
		svg = svg.replace('<svg ', '<svg id="'+id+'" ');
	}

	return {
		svg : svg,
		meta : plugin_meta
	};
};

exports.rapport = function(data) {
	log( '  — #'+data.id );
};
