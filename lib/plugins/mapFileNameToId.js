'use_strict';

var path   = require('path');
var _      = require('lodash');
_.str      = require('underscore.string');

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
exports.type   = 'per_item';
exports.params = {
	modifier : 'dashify',
	prefix   : 'svg-',
};

exports.fn = function (svg, meta_) {
	var file     = meta_.file;
	var name     = path.basename(file, path.extname(file));
	var modifier = modifiers[this.params.modifier];

	var matches = svg.match(re_match_id);
	var id      = (matches) ? matches[1] : null;

	var rapport = function(data) {
		return '  — #'+data.id;
	};

	var meta = {};

	if (!id) {
		id  = this.params.prefix+modifier(name);
		svg = svg.replace('<svg ', '<svg id="'+id+'" ');

		meta['id'] = id;
		meta['rapport'] = rapport(meta);
	}

	return {
		svg  : svg,
		meta : meta,
	};
};
