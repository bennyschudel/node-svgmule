'use strict';

var Svgo = require('svgo');
var q    = require('q');
var _    = require('lodash');

var PluginLoader = require('./plugin_loader');


function Optimizer(config_) {

	this.config = _.merge({

		plugins : {},
		svgo    : {},
		meta    : {},

	}, config_);

	this.plugins = [];
	this.svgo    = null;

}

Optimizer.prototype.optimize = function(svg) {
	var _this  = this;

	var meta = _.extend({
		plugins: {},
	}, this.config.meta);

	var p = this._loadPlugins()
		.then(function(plugins) {
			_this.plugins = plugins;

			_this.svgo = new Svgo(_this.config.svgo);

			return _this._optimizeSvg(svg);
		})
		.then(function(data) {
			var svg  = data.data;

			return _this._applyPlugins(svg, meta);
		});

	return p;
};

Optimizer.prototype._optimizeSvg = function(svg) {
	var deferred = q.defer();

	this.svgo.optimize(svg, function (result) {
		deferred.resolve(result);
	});

	return deferred.promise;
};

Optimizer.prototype._applyPlugins = function(svg_, meta) {
	var svg = svg_;

	_.each(this.plugins, function(plugin) {
		var result = plugin.fn(svg, meta);

		svg = result.svg;
		meta.plugins[plugin.name] = result.meta;
	});

	return {
		svg  : svg,
		meta : meta,
	};
};

Optimizer.prototype._loadPlugins = function() {
	var plugin_loader = new PluginLoader({
		type    : 'per_item',
		plugins : this.config.plugins,
	});

	return plugin_loader.load();
};

module.exports = Optimizer;

/*
var svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\
<svg width="76px" height="100px" viewBox="0 0 76 100" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:sketch="http://www.bohemiancoding.com/sketch/ns">\
    <title>icon-location</title>\
    <description>Created with Sketch (http://www.bohemiancoding.com/sketch)</description>\
    <defs></defs>\
    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage">\
        <g id="icon-location" sketch:type="MSArtboardGroup" fill="#000000">\
            <path d="M0,37.497264 C1.18825916e-06,62.6669737 38,100 38,100 C38,100 76.0000002,62.5684961 76,37.497264 C75.9999993,16.788093 58.9850746,0 38,0 C17.0117569,0 -6.87972256e-07,16.788093 0,37.497264 L0,37.497264 Z M38,56.2490229 C27.5058784,56.2490229 18.9984157,47.853413 18.9984157,37.497264 C18.9984157,27.1442419 27.5058784,18.748632 38,18.748632 C48.4941216,18.748632 56.9984157,27.1473688 56.9984157,37.497264 C56.9984157,47.853413 48.4941216,56.2490229 38,56.2490229 L38,56.2490229 Z" sketch:type="MSShapeGroup"></path>\
        </g>\
    </g>\
</svg>';
var cfg = {
	plugins: {
		mapFileNameToId: true
	},
	svgo: {
		plugins: [
			{ removeTitle: true }
		]
	},
	meta: {
		file: 'global/icon--location.svg'
	}
};

new Optimizer(cfg)
	.optimize(svg)
		.then(function(data) {
			console.log(data);
		});
*/