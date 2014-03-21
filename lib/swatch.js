'use strict';

var Lap = (function() {

	function Lap() {
		this._start = null;
		this._stop = null;

		this.start();
	}

	var _proto = Lap.prototype;

	_proto.now = function() {
		return (new Date()).getTime();
	};

	_proto.start = function() {
		if (!this._start) {
			this._start = this.now();
		}

		return this._start;
	};

	_proto.stop = function() {
		if (!this._start) { return -1; }

		if (!this._stop) {
			this._stop = this.now();
		}

		return this.duration();
	};

	_proto.duration = function() {
		return ((this._stop || this.now()) - this._start);
	};

	_proto.valueOf = _proto.duration;

	return Lap;

})();


var Watch = (function() {

	function Watch(label) {
		this.label = label;
		this.laps = [];

		this._lap = null;

		this.start();
	}

	var _proto = Watch.prototype;

	_proto.start = function() {
		var lap = this._lap = new Lap();

		this.laps.push(lap);

		return lap.start();
	};

	_proto.stop = function() {
		this._lap.stop();

		return this.total();
	};

	_proto.lap = function() {
		var duration = this.stop();
		this.start();

		return duration;
	};

	_proto.total = function() {
		return this.laps.reduce(function(value, lap) {
			return value + lap;
		}, 0) / 1e3;
	};

	_proto.valueOf = _proto.total;

	return Watch;

})();


var swatch = (function() {

	function Swatch() {
		this.watches = {};
	}

	var _proto = Swatch.prototype;

	_proto.watch = function(label) {
		var watches = this.watches;

		if (!(label in watches)) {
			watches[label] = new Watch(label);
		}

		return watches[label];
	};

	_proto.start = function(label) {
		var watch = this.watch(label);

		return watch.start();
	};

	_proto.stop = function(label, remove) {
		var watch = this.watch(label);

		if (remove) {
			this.remove(label);
		}

		return watch.stop();
	};

	_proto.lap = function(label) {
		var watch = this.watch(label);

		return watch.lap();
	};

	_proto.remove = function(label) {
		delete this.watches[label];
	};

	return new Swatch();

})();


module.exports = swatch;
