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
