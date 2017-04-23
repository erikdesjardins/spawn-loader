import { readFileSync, statSync } from 'fs';
import { join } from 'path';

import test from 'ava';
import webpack from 'webpack';
import rimraf from 'rimraf';

test('basic usage', async t => {
	await new Promise((resolve, reject) => {
		webpack({
			entry: join(__dirname, 'src/main.js'),
			bail: true,
			output: {
				path: join(__dirname, 'dist'),
				filename: 'main.bundle.js'
			},
			module: {
				loaders: [{
					test: /\.entry\.js$/,
					use: {
						loader: join(__dirname, '../index.js'),
						options: { name: '[name].spawned.js' }
					}
				}]
			}
		}, (err, stats) => {
			err ? reject(err) : resolve(stats);
		});
	});

	const mainBundle = readFileSync(join(__dirname, 'dist/main.bundle.js'), 'utf8');
	const otherEntry = readFileSync(join(__dirname, 'dist/other.entry.spawned.js'), 'utf8');
	const hi = readFileSync(join(__dirname, 'dist/children/hi.jpg'));
	const child1 = readFileSync(join(__dirname, 'dist/children/child1.js'), 'utf8');
	const subchild = readFileSync(join(__dirname, 'dist/children/subchild/subchild.js'), 'utf8');
	const defaults = readFileSync(join(__dirname, 'dist/defaults.js'), 'utf8');
	const manifest = readFileSync(join(__dirname, 'dist/inertOut/manifest.json'), 'utf8');

	t.regex(mainBundle, /"other\.entry\.spawned\.js"/, 'references spawned other entry');
	t.regex(mainBundle, /"children\/child1\.js"/, 'references spawned child1');
	t.regex(mainBundle, /"defaults\.js"/, 'references spawned defaults');
	t.regex(mainBundle, /"inertOut\/manifest\.json"/, 'references spawned manifest.json');
	t.regex(mainBundle, /__webpack_require__\.p = ""/, 'publicPath is empty');

	t.regex(otherEntry, /\bfunction __webpack_require__\b/, 'has prelude');
	t.regex(otherEntry, /var foo = bar;/, 'has expected content');
	t.regex(otherEntry, /__webpack_require__\.p = ""/, 'publicPath is empty');

	t.truthy(hi, 'hi.jpg exists');

	t.regex(child1, /\bfunction __webpack_require__\b/, 'has prelude');
	t.regex(child1, /"hi\.jpg"/, 'references hi.jpg');
	t.regex(child1, /"subchild\/subchild\.js"/, 'references spawned subchild');
	t.regex(child1, /__webpack_require__\.p = ""/, 'publicPath is empty');

	t.regex(subchild, /\bfunction __webpack_require__\b/, 'has prelude');
	t.regex(subchild, /var a = 'b';/, 'has expected content');
	t.regex(subchild, /__webpack_require__\.p = ""/, 'publicPath is empty');

	t.regex(defaults, /\bfunction __webpack_require__\b/, 'has prelude');
	t.regex(defaults, /var def = 'aults';/, 'has expected content');
	t.regex(defaults, /__webpack_require__\.p = ""/, 'publicPath is empty');

	t.regex(manifest, /^\{ "manifest": "json" \}\s+$/, 'manifest.json exists, is raw content');
});

test.after(t => {
	rimraf.sync(join(__dirname, 'dist'));
});
