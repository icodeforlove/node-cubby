/*jshint node:true*/
(function () {
	'use strict';
	
	var fs = require('fs');

	function Cubby ($config) {
		$config = $config || {};

		this._file = $config.file || 'cubby.json';
		this._db = this._load();
	}

	Cubby.prototype = {
		get: function (key) {
			return key in this._db ? this._db[key] : null;
		},

		set: function (key, value) {
			if (arguments.length === 1) {
				var values = arguments[0];
				for (key in values) this._db[key] = values[key];
			} else {
				this._db[key] = value;
			}
			this._save();
		},

		remove: function (key) {
			delete this._db[key];
			this._save();
		},

		empty: function () {
			var self = this;
			Object.keys(this._db).forEach(function (key) {
				self._db[key] = undefined;
				delete self._db[key];
			});
			this._save();
		},

		setPath: function (path, value) {
			var current = this._db;

			path = path.split('.');

			path.forEach(function (segment, key) {
				if (typeof current !== 'object' && key !== path.length-1) {
					throw new Error('trying to store a value into a ' + typeof current);
				} else if (!(segment in current)) {
					current = current[segment] = key === path.length-1 ? value : Object.create(null);
				} else {
					if (key === path.length-1) {
						current[segment] = value;
					} else {
						current = current[segment];
					}
				}
			}, this);

			this._save();
		},

		getPath: function (path) {
			var current = this._db;
			
			path = path.split('.');

			for (var segment = 0; segment < path.length; segment++) {
				if (typeof path[segment] !== 'object' && segment !== path.length-1 || !(path[segment] in current)) {
					return undefined;
				} else {
					current = current[path[segment]];
				}
			}

			return current;
		},

		_load: function () {
			if (fs.existsSync(this._file)) {
				return JSON.parse(fs.readFileSync(this._file));
			} else {
				fs.writeFileSync(this._file, '{}');
				return Object.create(null);
			}
		},

		_save: function () {
			fs.writeFileSync(this._file, JSON.stringify(this._db));
		}
	};

	module.exports = Cubby;
})();