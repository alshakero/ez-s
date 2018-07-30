const test = require('ava');
const { spawn } = require('child_process');
const request = require('request');

async function runEZS(args = []) {
  return new Promise(r => {
    const process = spawn('node', ['./bin/ez-s.js', ...args]);
    process.stdout.on('data', data => {
      r(process);
    });
  });
}

test('Should work without any config', async t => {
  const process = await runEZS();
  const body = await new Promise((res, reject) => {
    request('https://ez-s.io', function(error, response, body) {
      if (error) {
        reject(error);
      }
      res(body);
    });
  });
  t.is(body.includes('click to toggle the view'), true); // this text comes from `serve` file list page
  process.kill();
});

test('Should accept a dir argument', async t => {
  const process = await runEZS(['./test/test-data']);

  const body = await new Promise((res, reject) => {
    request('https://ez-s.io', function(error, response, body) {
      if (error) {
        reject(error);
      }
      res(body);
    });
  });
  t.is(body, 'Hello HTTPS world!');
  process.kill();
});

test('Should accept a port argument', async t => {
  const process = await runEZS(['./test/test-data', '--port=5001']);

  const body = await new Promise((res, reject) => {
    request('https://ez-s.io:5001', function(error, response, body) {
      if (error) {
        reject(error);
      }
      res(body);
    });
  });
  t.is(body, 'Hello HTTPS world!');
  process.kill();
});
