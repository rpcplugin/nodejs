// When calling rpcplugin from your own program, import it just as 'rpcplugin'.
const rpcplugin = require('../rpcplugin');
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const protoPath = __dirname + '/countplugin1.proto';
const packageDefinition = protoLoader.loadSync(
    protoPath,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
const counterProto = grpc.loadPackageDefinition(packageDefinition).countplugin1;

rpcplugin.serve({
    handshake: {
        cookieKey: "COUNT_PLUGIN_COOKIE",
        cookieValue: "e8f9c7d7-20fd-55c7-83f9-bee91db2922b",
    },
    protoVersions: {
        1: function (server) {
            var count = 0;
            server.addService(counterProto.Counter.service, {
                Count: function (call, callback) {
                    count++;
                    console.error('incremented counter to', count);
                    callback(null, {});
                },
                GetCount: function (call, callback) {
                    console.error('client requests count', count);
                    callback(null, { count: count });
                },
            });
        },
    },
});
