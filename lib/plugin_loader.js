'use strict';

var path = require('path');

var PLUGINS_DIR = __dirname+'/plugins/';

var _ = require('lodash');

var utils = require('./utils');


function PluginLoader(config_) {

	this.config = _.merge({

		dir     : PLUGINS_DIR,
		type    : 'per_folder',
		plugins : {},

	}, config_);

	this.plugins = {};

}

PluginLoader.prototype.load = function() {
	var _this  = this;
	var config = this.config;

	var p = this._loadPlugins(config.dir)
		.then(function() {
			return _.filter(_this.plugins, {
				active : true,
				type   : config.type
			});
		});

	return p;
};

PluginLoader.prototype._loadPlugin = function(file) {
	var name = path.basename(file, path.extname(file));

	var plugin = require(file);

	var plugin_config = this.config.plugins[name];

	plugin.name   = name;
	plugin.active = !!plugin_config;

	if (_.isPlainObject(plugin_config)) {
		_.extend(plugin.params, plugin_config);
	}

	return this.plugins[name] = plugin;
};

PluginLoader.prototype._loadPlugins = function(dir) {
	var _this = this;

	var p = utils.globFiles(dir+'*.js')
		.then(function(files) {
			_.each(files, function(file) {
				_this._loadPlugin(file);
			});
		});

	return p;
};

module.exports = PluginLoader;
