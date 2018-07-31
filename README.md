![EZ-S Logo](https://user-images.githubusercontent.com/17054134/43371384-dc63dbbc-9390-11e8-9866-42a7e9410047.png)

> Serving HTTP for development is fairly easy. Serving HTTPS is not. This tools gives your HTTP an easy S.

EZ-S is a fork of [zeit/serve](https://github.com/zeit/serve) that gives you the ability to locally run a green-badge HTTPS server with zero configuration! No certificate creation, no tunnels, no hassle. Just run `ez-s` and access `https://ez-s.io:5000` to see your folder served with a lovely green badge 🤯. Test your Service Workers, secure cookies etc.. [_(but how?)_](#how-this-works).

[![Build Status](https://travis-ci.org/alshakero/ez-s.svg?branch=master)](https://travis-ci.org/alshakero/ez-s)

## Usage

Firstly, install the package using Yarn or NPM (you'll need at least [Node.js LTS](https://nodejs.org/en/)):

```bash
yarn global add @alshakero/ez-s
# or
npm install -g @alshakero/ez-s
```

_Sadly, there is another package called ezs. And NPM won't let me publish my package unscoped due to name similiarity._.

Once that's done, you can run this command inside your project's directory:

```bash
ez-s
```

You may run this command to see a list of all available options:

```bash
ez-s --help
```

If you're fimiliar with `serve`, `ez-s` accepts exactly the same arguments except `-l, --listen`. It accepts `--port` instead. The reasoning is explained in How this works section below.

## How this works?

1. The domain `ez-s.io` has a single `A` DNS record pointing to the IP address `127.0.0.1`. 
2. In this package there are included certificates generated by letsencrypt.
3. The HTTPS server uses the aforementioned certificates including the private key. So when you access `ez-s.io` the certificate provided will actually match letsecrypt's, the IP address of the host does not matter. As long as letsencrypt records match the certificates provided by the server, Chrome will not object.

Wait what? Public private keys?! Yes. Because the domain will forever point to 127.0.0.1, _impersonating it_ will not take the impersonator anywhere. Unless the impersonator has power over the victims DNS server, which makes ez-s the least of the victim's worries 😁

### Caveat

Since `ez-s.io` points to `localhost`, your app will be only accessible locally. You can't test it on your phone or using another machine. Using a SauceLabs tunnel would perfectly work though. 

Due to this caveat, `serve`'s `--listen` argument is useless in this case. The only configurble network-related parameter is the port. 

## Configuration

Please see `serve`'s [configuration](https://github.com/zeit/serve#configuration) section.

## Supporting this tool

If you like it, please give it a star ⭐

## Contributing

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device
2. Uninstall `ez-s` if it's already installed: `npm uninstall -g @alshakero/ez-s`
3. Link it to the global module directory: `npm link`

After that, you can use the `ez-s` command everywhere.

## What if you don't want to use `serve` 

You can download the certificates from `certs` folder and use them with any server you want. After you set your server up, access `https://ez-s.io` and it should work.

### Upcoming features

- Soon, there will be a `--tunnel` argument. This argument will **locally** tunnel your own HTTP server to an HTTPS endpoint. All on your machine in a single command. 
- Your suggested feature. Please create an issue if you think if you have a feature request.

## Credits

This project is almost identical to Zeit's. The best part of the credit goes to them. My idea was to offer HTTPS and found it wasteful to re-create the underlaying HTTP logic. Huge thanks to Zeit!

## Author

Omar Alshaker 
