'use strict';

var fs   = require('fs');
var path = require('path');

var DEFAULTS_FILE = __dirname+'/defaults.yml';

var yaml     = require('js-yaml');
var q        = require('q');
var _        = require('lodash');
_.str        = require('underscore.string');
var moment   = require('moment');
var filesize = require('filesize');
var colors   = require('colors');

var io_capture   = require('./io_capture');
var swatch       = require('./swatch');
var utils        = require('./utils');
var PluginLoader = require('./plugin_loader');
var Optimizer    = require('./optimizer');

var log = console.log;


function Svgmule(options) {
		// omit the svgmule root key for now because it's the only one so far...
	this.config = this._loadConfig(options.config).svgmule;

	this.plugins = {};
}

Svgmule.prototype.run = function() {
	var _this = this;

	var stdout = io_capture().stdout({
		verbose: this.config.verbose
	});

	swatch.start('main');

	var p = utils.globFiles(this.config.input_dir+'/**/')
		.then(function(data) {
			return _this._pack(data);
		})
		.then(function(data) {
			return _this._rapport( _.compact(data) );
		})
		.then(function(data) {
			return [stdout(), data];
		});

	return p;
};

Svgmule.prototype._loadConfig = function(custom) {
	return _.merge({}, require(DEFAULTS_FILE), custom);
};

Svgmule.prototype._loadOptimizerConfig = function(file, config_) {
	if (!fs.existsSync(file)) { return config_; }

	var mode   = 'extend';
	var config = require(file);

	if ('mode' in config) {
		mode = config.mode;
		delete config.mode;
	}

	if (mode === 'replace') {
		return config;
	}

	return _.merge({}, config_, config);
};

Svgmule.prototype._processFile = function(file, opt_config_) {
	var _this  = this;

	var considerFileConfig = function(file_, conf) {
		var file = path.normalize( file_+'.yml' );

		return _this._loadOptimizerConfig(file, conf);
	};

	var opt_config = considerFileConfig(file, opt_config_);

	opt_config = _.merge({
		meta : {
			file : file.replace(this.config.input_dir, ''),
		},
	}, opt_config);

	var p = utils.readFile(file)
		.then(function(data) {

			var optimizer = new Optimizer(opt_config);

			return optimizer.optimize(data);

		})
		.fail(function(err) {
			return err;
		});

	return p;
};

Svgmule.prototype._processFiles = function(files, dir) {
	var _this  = this;
	var config = this.config;

	var ps = [];
	var re_excluded = eval( config.exclude_pattern );

		// extract optimizer config
	var opt_config = _.pick(config, ['plugins', 'svgo']);

	var isExcluded = function(file) {
		return re_excluded.test( path.basename(file) );
	};
	var considerDirConfig = function(dir, conf) {
		var file = path.normalize( _.str.trim(dir, path.sep)+'.yml' );

		return _this._loadOptimizerConfig(file, conf);
	};

	opt_config = considerDirConfig(dir, opt_config);

	_.each(files, function (file) {
		if (isExcluded(file)) { return; }

		ps.push( _this._processFile(file, opt_config) );
	});

	return q.all(ps);
};

Svgmule.prototype._writeFile = function(file, data) {
	var p = utils.createDir(this.config.output_dir)
		.then(function() {
			return utils.writeFile(file, data);
		});

	return p;
};

Svgmule.prototype._buildSvg = function(data, meta) {
	var config = this.config;

	var svg_files = [];
	var svg_meta  = [];
	var body      = '';
	var template  = _.template(config.template);
	var prefix    = config.template.match(/([\s]*)<%[^b]*body/)[1];

	_.each(data, function(item, index) {
		svg_files.push(prefix+item.svg);
		svg_meta.push(item.meta);
	});

	if (!svg_files.length) { return ''; }

	meta['src_files'] = svg_meta;
	body = svg_files.join('\n');

	return template({
		moment : moment,
		meta   : meta,
		body   : body,
	});
};

Svgmule.prototype._packDir = function(dir) {
	var _this  = this;
	var config = this.config;

	var rel_path  = dir.replace(config.input_dir, '') || 'global';
	var base_name = _.str.trim(rel_path, path.sep).split(path.sep).join('.');
	var file_name = base_name+'.svg';
	var file      = config.output_dir+file_name;

	var meta = {
		src_dir   : dir,
		base_name : base_name,
		file_name : file_name,
		file      : file,
	};

	var p = utils.globFiles(dir+'*.svg')
		.then(function(files) {
			return _this._processFiles(files, dir);
		})
		.then(function(data) {
			if (!data || !data.length) {
				return false;
			}
			else {
				var svg = _this._buildSvg(data, meta);

				return _this._writeFile(file, svg)
					.then(function() {
						return meta;
					});
			}
		});

	return p;
};

Svgmule.prototype._pack = function(dirs) {
	var _this = this;
	var config = this.config;

	var ps = [];
	var re_excluded = eval(config.exclude_pattern);

	var isOutputDir = function(dir) {
		return (path.resolve(dir) === path.resolve(config.output_dir));
	};
	var isExcluded = function(dir) {
		return _.reduce(dir.split(path.sep), function(value, name) {
			return value || re_excluded.test(name);
		}, false);
	};

	_.each(dirs, function(dir) {
		if (isExcluded(dir) || isOutputDir(dir)) { return; }

		ps.push( _this._packDir(dir) );
	});

	return q.all(ps);
};

Svgmule.prototype._rapport = function(data) {
	var _this  = this;
	var config = this.config;

	var ps = [];

	_.each(data, function (meta) {
		ps.push( utils.fileStats(meta.file) );
	});

	var p = q.all(ps)
		.then(function (stats) {
			_.each(stats, function (file_stats, index) {
				data[index]['file_size'] = filesize(file_stats.size);
			});
		})
		.then(function () {

			log( '' );
			log( ('svgmule Rapport — ('+swatch.stop('main')+'s)').blue.underline );
			log( '' );
			log( '  '+moment().format('LLL'));
			log( '  '+config.input_dir+' → '+config.output_dir );
			log( '' );
			_.each(data, function(item) {
				log( '↓ '.green+(item.file+' — ('+item.file_size+')').green.underline );
				_.each(item.src_files, function(file) {
					log( '' );
					log( '→ '.cyan+(file.file).cyan.underline );
					_.each(file.plugins, function(plugin_data, name) {
						if ('rapport' in plugin_data) {
							log( plugin_data.rapport );
						}
					});
				});
				log( '' );
			});

		})
		.then(function() {
			return data;
		});

	return p;
};

module.exports = Svgmule;
