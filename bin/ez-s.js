#!/usr/bin/env node

// Native
const https = require('https');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { parse } = require('url');
const dns = require('dns');
const os = require('os');

// Packages
const Ajv = require('ajv');
const checkForUpdate = require('update-check');
const chalk = require('chalk');
const arg = require('arg');
const { write: copy } = require('clipboardy');
const handler = require('serve-handler');
const schema = require('@zeit/schemas/deployment/config-static');
const boxen = require('boxen');

// Utilities
const pkg = require('../package');

const readFile = promisify(fs.readFile);
const lookup = promisify(dns.lookup);

const warning = message => chalk`{yellow WARNING:} ${message}`;
const info = message => chalk`{magenta INFO:} ${message}`;
const error = message => chalk`{red ERROR:} ${message}`;

// Certificate
const privateKey = fs.readFileSync(path.resolve(__dirname, '../certs/privkey.pem'), 'utf8');
const certificate = fs.readFileSync(path.resolve(__dirname, '../certs/cert.pem'), 'utf8');
const ca = fs.readFileSync(path.resolve(__dirname, '../certs/fullchain.pem'), 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

const updateCheck = async isDebugging => {
	let update = null;

	try {
		update = await checkForUpdate(pkg);
	} catch (err) {
		const suffix = isDebugging ? ':' : ' (use `--debug` to see full error)';
		console.error(warning(`Checking for updates failed${suffix}`));

		if (isDebugging) {
			console.error(err);
		}
	}

	if (!update) {
		return;
	}

	console.log(
		`${chalk.bgRed(
			'UPDATE AVAILABLE'
		)} The latest version of \`ez-s\` is ${update.latest}`
	);
};

const getHelp = () => chalk`
  {bold.cyan ez-s} - Static file serving and directory listing

  {bold USAGE}

      {bold $} {cyan ez-s} --help
      {bold $} {cyan ez-s} --version
      {bold $} {cyan ez-s} [-p 8080] [{underline directory}]

      By default, {cyan ez-s} will listen on {bold ez-s.io:443} and serve the
      current working directory on that address.

  {bold OPTIONS}

      --help                              Shows this help message

      -v, --version                       Displays the current version of ez-s

      -p, --port                          Specify the port to listen to

      -d, --debug                         Show debugging information

      -s, --single                        Rewrite all not-found requests to \`index.html\`

      -c, --config                        Specify custom path to \`ez-s.json\`

      -n, --no-clipboard                  Do not copy the local address to the clipboard
`;

const registerShutdown = fn => {
	let run = false;

	const wrapper = () => {
		if (!run) {
			run = true;
			fn();
		}
	};

	process.on('SIGINT', wrapper);
	process.on('SIGTERM', wrapper);
	process.on('exit', wrapper);
};

const startEndpoint = (port, config, args) => {
	const httpsServer = https.createServer(credentials, (request, response) =>
		handler(request, response, config)
	);

	const { isTTY } = process.stdout;
	const clipboard = args['--no-clipboard'] !== true;

	httpsServer.on('error', err => {
		console.error(error(`HTTP server — failed to serve: ${err.stack}`));
		process.exit(1);
	});

	httpsServer.listen(port, async () => {
		registerShutdown(() => httpsServer.close());

		let localAddress = null;

		if (port === 443) {
			localAddress = `https://ez-s.io`;
		} else {
			localAddress = `https://ez-s.io:${port}`;
		}

		if (isTTY && process.env.NODE_ENV !== 'production') {
			let message = chalk.green('Serving!');

			if (localAddress) {
				message += `\n\n${chalk.bold(`On:`)}     ${localAddress}`;
			}

			if (clipboard) {
				try {
					await copy(localAddress);
					message += `\n\n${chalk.grey(
						'Copied address to clipboard!'
					)}`;
				} catch (err) {
					console.error(
						error(`Cannot copy to clipboard: ${err.message}`)
					);
				}
			}

			console.log(
				boxen(message, {
					padding: 1,
					borderColor: 'green',
					margin: 1
				})
			);
		} else {
			const suffix = localAddress ? ` at ${localAddress}` : '';
			console.log(info(`Accepting connections${suffix}`));
		}
	});
};

const loadConfig = async (cwd, entry, args) => {
	const files = ['ez-s.json', 'now.json', 'package.json'];

	if (args['--config']) {
		files.unshift(args['--config']);
	}

	const config = {};

	for (const file of files) {
		const location = path.join(entry, file);
		let content = null;

		try {
			content = await readFile(location, 'utf8');
		} catch (err) {
			if (err.code === 'ENOENT') {
				continue;
			}

			console.error(
				error(`Not able to read ${location}: ${err.message}`)
			);
			process.exit(1);
		}

		try {
			content = JSON.parse(content);
		} catch (err) {
			console.error(
				error(`Could not parse ${location} as JSON: ${err.message}`)
			);
			process.exit(1);
		}

		if (typeof content !== 'object') {
			console.error(
				warning(
					`Didn't find a valid object in ${location}. Skipping...`
				)
			);
			continue;
		}

		try {
			switch (file) {
				case 'now.json':
					content = content.static;
					break;
				case 'package.json':
					content = content.now.static;
					break;
			}
		} catch (err) {
			continue;
		}

		Object.assign(config, content);
		console.log(info(`Discovered configuration in \`${file}\``));

		break;
	}

	if (entry) {
		const { public } = config;
		config.public = path.relative(
			cwd,
			public ? path.join(entry, public) : entry
		);
	}

	if (Object.keys(config).length !== 0) {
		const ajv = new Ajv();
		const validateSchema = ajv.compile(schema);

		if (!validateSchema(config)) {
			const defaultMessage = error(
				'The configuration you provided is wrong:'
			);
			const { message, params } = validateSchema.errors[0];

			console.error(
				`${defaultMessage}\n${message}\n${JSON.stringify(params)}`
			);
			process.exit(1);
		}
	}

	return config;
};

(async () => {
	let args = null;

	try {
		args = arg({
			'--help': Boolean,
			'--version': Boolean,
			'--port': Number,
			'--single': Boolean,
			'--debug': Boolean,
			'--config': String,
			'--no-clipboard': Boolean,
			'-h': '--help',
			'-v': '--version',
			'-s': '--single',
			'-d': '--debug',
			'-c': '--config',
			'-n': '--no-clipboard',
			'-p': '--port'
		});
	} catch (err) {
		console.error(error(err.message));
		process.exit(1);
	}

	await updateCheck(args['--debug']);

	if (args['--version']) {
		console.log(pkg.version);
		return;
	}

	if (args['--help']) {
		console.log(getHelp());
		return;
	}

	if (!args['--port']) {
		// Default endpoint
		args['--port'] = process.env.PORT || 443;
	}

	if (args._.length > 1) {
		console.error(error('Please provide one path argument at maximum'));
		process.exit(1);
	}

	const cwd = process.cwd();
	const entry = args._.length > 0 ? path.resolve(args._[0]) : cwd;

	const config = await loadConfig(cwd, entry, args);

	if (args['--single']) {
		const { rewrites } = config;
		const existingRewrites = Array.isArray(rewrites) ? rewrites : [];

		// As the first rewrite rule, make `--single` work
		config.rewrites = [
			{
				source: '**',
				destination: '/index.html'
			},
			...existingRewrites
		];
	}

	startEndpoint(args['--port'], config, args);

	registerShutdown(() => {
		console.log(`\n${info('Gracefully shutting down. Please wait...')}`);

		process.on('SIGINT', () => {
			console.log(`\n${warning('Force-closing all open sockets...')}`);
			process.exit(0);
		});
	});
})();
