/**
 * @author Eoin Hennessy
 * @author Erik Desjardins
 * See LICENSE file in root directory for full license.
 */

'use strict';

var path = require('path');
var loaderUtils = require('loader-utils');
var SingleEntryPlugin = require('webpack').SingleEntryPlugin;
var InertEntryPlugin = require('inert-entry-webpack-plugin');

module.exports = function() {};

module.exports.pitch = function(request) {
	var callback = this.async();

	var options = loaderUtils.getOptions(this) || {};
	var context = options.context || this.rootContext;
	var name = options.name || path.basename(this.resourcePath);
	var filename = loaderUtils.interpolateName(this, name, { context: context });
	var outputDir = options.path || '.';
	var plugins = options.plugins || [];
	if (options.inert) {
		plugins = [new InertEntryPlugin()].concat(plugins);
	}

	// name of the entry and compiler (in logs)
	var debugName = loaderUtils.interpolateName(this, '[name]', {});

	// create a child compiler (hacky)
	var compiler = this._compilation.createChildCompiler(debugName, { filename: filename }, plugins);
	new SingleEntryPlugin(this.context, '!!' + request, debugName).apply(compiler);

	// add a dependency on the entry point of the child compiler, so watch mode works
	// ...this format is required for webpack 4
	this.addDependency(request);
	// ...and this format is required for webpack 5
	this.addDependency(this.resourcePath);

	// like compiler.runAsChild(), but remaps paths if necessary
	// https://github.com/webpack/webpack/blob/f6e366b4be1cfe2770251a890d93081824789209/lib/Compiler.js#L206
	compiler.compile(function(err, compilation) {
		if (err) return callback(err);

		this.parentCompilation.children.push(compilation);
		for (const name of Object.keys(compilation.assets)) {
			this.parentCompilation.assets[path.join(outputDir, name)] = compilation.assets[name];
		}

		// the first file in the first chunk of the first (should only be one) entry point is the real file
		// see https://github.com/webpack/webpack/blob/f6e366b4be1cfe2770251a890d93081824789209/lib/Compiler.js#L215
		var outputFilename = compilation.entrypoints.values().next().value.chunks[0].files[0];

		callback(null, 'module.exports = __webpack_public_path__ + ' + JSON.stringify(path.join(outputDir, outputFilename)) + ';')
	}.bind(compiler));
};
