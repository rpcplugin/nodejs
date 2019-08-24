const grpc = require('grpc');
const grpcHealth = require('grpc-health-check');
const tls = require('./tls');

function serve(opts) {
    if (!opts.protoVersions) {
        throw new Error('protoVersions is required');
    }
    if (!opts.handshake) {
        throw new Error('handshake config is required');
    }
    var credentials = opts.credentials;

    if (process.env[opts.handshake.cookieKey] != opts.handshake.cookieValue) {
        console.error('This program is a plugin, only for use in conjunction with its host program.');
        process.exit(1);
    }

    [protoVersion, impl] = negotiateProtoVersion(opts.protoVersions)

    var server = new grpc.Server();

    // Healthcheck service is mandatory for all plugin servers.
    server.addService(grpcHealth.service, new grpcHealth.Implementation({}));

    // Also register the selected plugin service.
    impl(server);

    var autoTLS;
    if (!credentials) {
        autoTLS = tls.serverAutoTLS();
        credentials = autoTLS.credentials;
    }

    transports = (process.env['PLUGIN_TRANSPORTS'] || 'tcp').split(',');
    let portAddr = null;
    for (let i = 0; i < transports.length; i++) {
        if (transports[i] == 'tcp') {
            let port = server.bind('127.0.0.1:0', credentials);
            portAddr = '127.0.0.1:' + port;
            break;
        }
    }
    if (!portAddr) {
        throw new Error('failed to negotiate common transport with client');
    }

    server.start();

    // This handshake tells the client where to connect and what protocol
    // to talk when it does.
    let handshakeParts = ['1', protoVersion, 'tcp', portAddr, 'grpc'];
    if (autoTLS) {
        handshakeParts.push(autoTLS.certBase64);
    }
    process.stdout.write(handshakeParts.join('|') + '\n');
}

function negotiateProtoVersion(protoVersions) {
    const possibleVersionsStr = process.env['PLUGIN_PROTOCOL_VERSIONS'];
    if (!possibleVersionsStr) {
        throw new Error('plugin client did not announce any supported protocol versions');
    }

    const possibleVersions = possibleVersionsStr.split(',');
    possibleVersions.sort(function (a, b) {
        return parseInt(b) - parseInt(a);
    });
    for (var i = 0; i < possibleVersions.length; i++) {
        let protoVersion = possibleVersions[i];
        let impl = protoVersions[possibleVersions[i]];
        if (impl) {
            return [parseInt(protoVersion), impl];
        }
    }

    throw new Error('plugin client does not support any protocols supported by this server');
}


module.exports = {
    serve: serve,
};
