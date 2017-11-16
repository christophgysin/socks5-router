#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const socks = require('socksv5');

function get_config() {
  const filename = '.config/socksyproxy/config.yaml';
  const filepath = path.join(process.env.HOME, filename);
  const data = fs.readFileSync(filepath);
  return yaml.safeLoad(data);
}

function get_proxy(proxies, host, port) {
  const dest = `${host}:${port}`;

  return proxies.find((proxy) => proxy.regex.some((regex) => dest.match(regex)));
}

function connection(proxies) {
  return (info, accept, deny) => {
    const proxy = get_proxy(proxies, info.dstAddr, info.dstPort);

    if (!proxy) {
      accept();
      return;
    }

    socket_in = accept(true);
    process.nextTick(function() {
      socket_in.pause()
    });

    socks.connect({
      host: info.dstAddr,
      port: info.dstPort,
      proxyHost: proxy.host,
      proxyPort: proxy.port,
      localDNS: !proxy.dns,
      auths: [
        socks.auth.None(),
      ],
    }, (socket_out) => {
      socket_in.pipe(socket_out);
      socket_out.pipe(socket_in);
      socket_in.resume();
    });
  }
}

function run() {
  const config = get_config();
  const host = config.address || 'localhost';
  const port = config.port || 8888;

  const srv = socks.createServer(connection(config.proxy));
  srv.useAuth(socks.auth.None());
  srv.listen(port, host, () => {
    console.log('SOCKS server listening on', `${host}:${port}`);
  });
}

run();
