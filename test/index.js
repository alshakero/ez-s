const test = require('ava');
const { spawn } = require('child_process');
const request = require('request');

async function runEZS(args = []) {
  return new Promise(r => {
    const EZSProcess = spawn('node', ['./bin/ez-s.js', ...args]);
    EZSProcess.stdout.on('data', data => {
      r(EZSProcess);
    });
    EZSProcess.stderr.on('data', data => {
      console.error('Failed to start ez-s,', data.toString());
      EZSProcess.exit(1);
    });
  });
}

test('Should work without any config', async t => {
  const EZSProcess = await runEZS();
  const body = await new Promise((res, reject) => {
    request('https://ez-s.io:5000', function(error, response, body) {
      if (error) {
        reject(error);
      }
      res(body);
    });
  });
  t.is(body.includes('click to toggle the view'), true); // this text comes from `serve` file list page
  EZSProcess.kill();
});

test('Should accept a dir argument', async t => {
  const EZSProcess = await runEZS(['./test/test-data']);

  const body = await new Promise((res, reject) => {
    request('https://ez-s.io:5000', function(error, response, body) {
      if (error) {
        reject(error);
      }
      res(body);
    });
  });
  t.is(body, 'Hello HTTPS world!');
  EZSProcess.kill();
});

test('Should accept a port argument', async t => {
  const EZSProcess = await runEZS(['./test/test-data', '--port=5001']);

  const body = await new Promise((res, reject) => {
    request('https://ez-s.io:5001', function(error, response, body) {
      if (error) {
        reject(error);
      }
      res(body);
    });
  });
  t.is(body, 'Hello HTTPS world!');
  EZSProcess.kill();
});
