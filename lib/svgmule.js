'use strict';

var path = require('path');
var fs   = require('fs');
var util = require('util');

var DEFAULTS_FILE = __dirname+'/defaults.yml';
var PLUGINS_DIR   = __dirname+'/plugins/';

var yaml     = require('js-yaml');
var glob     = require('glob');
var svgo     = require('svgo');
var q        = require('q');
var _        = require('lodash');
_.str        = require('underscore.string');
var moment   = require('moment');
var mkdirp   = require('mkdirp');
var filesize = require('filesize');
var colors   = require('colors');

var swatch   = require('./swatch');

var plugins = {};

var config, optimizer;

var log = console.log;

	/* io */

function hookStdout(cb, verbose) {
	var old_write = process.stdout.write;

	process.stdout.write = (function(write) {
		return function(string, encoding, fd) {
			if (verbose) {
				write.apply(process.stdout, arguments);
			}
			cb(string, encoding, fd);
		};
	})(process.stdout.write);

	return function() {
		process.stdout.write = old_write;
	};
}

	/* / */

	/* helpers */

function readFile(file) {
	return q.nfcall(fs.readFile, file, 'utf8');
}

function writeFile(file, data) {
	return q.nfcall(fs.writeFile, file, data);
}

function fileStats(file) {
	return q.nfcall(fs.stat, file);
}

function createDir(dir) {
	return q.nfcall(mkdirp, dir);
}

function globFiles(pattern, options) {
	return q.nfcall(glob, pattern, options);
}

	/* / */

	/* config */

function loadConfig(custom_config) {
	return _.merge({}, require(DEFAULTS_FILE), custom_config);
}

	/* / */

	/* plugins */

function loadPlugin(file) {
	var name   = path.basename(file, path.extname(file));
	var plugin = require(file);

	var plugin_config = config.plugins[name];

	plugin.name   = name;
	plugin.active = !!plugin_config;

	if (_.isPlainObject(plugin_config)) {
		_.extend(plugin.params, plugin_config);
	}

	return plugins[name] = plugin;
}

function loadPlugins(dir) {
	if (!dir) { dir = PLUGINS_DIR; }

	return globFiles(dir+'*.js')
		.then(function (files) {
			_.each(files, function (file) {
				loadPlugin(file);
			});
		});
}

	/* / */

	/* methods */

function optimizeSvg(data) {
	var deferred = q.defer();

	optimizer.optimize(data, function (result) {
		deferred.resolve(result);
	});

	return deferred.promise;
}

function processFile(file) {
	return readFile(file)
		.then(function (data) {
			return optimizeSvg(data);
		})
		.then(function (data) {
			data['file'] = file;

			return data;
		})
		.fail(function (err) {
			return err;
		});
}

function processFiles(files) {
	var promises    = [];
	var re_excluded = eval(config.exclude_pattern);

	function isExcluded(file) {
		return re_excluded.test( path.basename(file) );
	}

	_.each(files, function (file) {
		if (isExcluded(file)) { return; }

		promises.push( processFile(file) );
	});

	return q.all(promises);
}


function applyPlugins(svg_, meta) {
	var svg = svg_;
	var active_plugins = _.filter(plugins, 'active');

	_.each(active_plugins, function(plugin) {
		var result = plugin.fn(svg, meta);

		svg = result.svg;
		meta.plugins[plugin.name] = result.meta;
	});

	return {
		svg  : svg,
		meta : meta,
	};
}

function parseSvg(data) {
	var svg  = data.data;
	var meta = {
		file     : data.file.replace(config.input_dir, ''),
		src_file : data.file,
		plugins  : {},
	};

	return applyPlugins(svg, meta);
}

function buildSvg(data, meta) {
	var svg_files = [];
	var svg_meta  = [];
	var body      = '';
	var template  = _.template(config.template);
	var prefix    = config.template.match(/([\s]*)<%[^b]*body/)[1];

	_.each(data, function(svg, index) {
		var result = parseSvg(svg);

		svg_files.push(prefix+result.svg);
		svg_meta.push(result.meta);
	});

	if (!svg_files.length) { return ''; }

	meta['src_files'] = svg_meta;
	body = svg_files.join('\n');

	return template({
		moment : moment,
		meta   : meta,
		body   : body,
	});
}

function packDir(dir) {
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

	return globFiles(dir+'*.svg')
		.then(processFiles)
		.then(function(data) {
			if (!(data && data.length)) { return false; }

			var svg = buildSvg(data, meta);

			return createDir(config.output_dir)
				.then(function() {
					return writeFile(file, svg);
				})
				.then(function() {
					return meta;
				});
		});
}

function pack(dirs) {
	var promises = [];
	var re_excluded = eval(config.exclude_pattern);

	function isOutputDir(dir) {
		return (path.resolve(dir) === path.resolve(config.output_dir));
	}
	function isExcluded(dir) {
		return _.reduce(dir.split(path.sep), function(value, name) {
			return value || re_excluded.test(name);
		}, false);
	}

	_.each(dirs, function(dir) {
		if (isExcluded(dir) || isOutputDir(dir)) { return; }

		promises.push( packDir(dir) );
	});

	return q.all(promises);
}

function rapport(data) {
	var promises = [];

	_.each(data, function (meta) {
		promises.push( fileStats(meta.file) );
	});

	return q.all(promises)
		.then(function (stats) {
			_.each(stats, function (file_stats, index) {
				data[index]['file_size'] = filesize(file_stats.size);
			});
		})
		.then(function () {

			log( '' );
			log( ('svgmule Rapport — ('+swatch.stop('main')+'s)').red.underline );
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
						try {
							plugins[name].rapport(plugin_data);
						} catch(e) {}
					});
				});
				log( '' );
			});

		})
		.then(function() {
			return data;
		});
}

	/* / */

	/*** main ***/

function main(options) {
	var stdout = '';

		// omit the svgmule root key for now because it's the only one so far...
	config = loadConfig(options.config).svgmule;

		// hijack stdout
	var unhook = hookStdout(function(string, encoding, fd) {
		stdout += string;
	}, config.verbose);

	optimizer = new svgo(config.svgo);

	loadPlugins(PLUGINS_DIR);

	swatch.start('main');

	return globFiles(config.input_dir+'/**/')
		.then(pack)
		.then(function(data) {
			return rapport( _.compact(data) );
		})
		.then(function(data) {
			unhook();

			return [stdout, data];
		});
}

module.exports = main;

	/* / */

