const forge = require('node-forge');
const grpc = require('grpc');

function createCertificate(hostname) {
    hostname = hostname || 'localhost';
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);
    cert.setSubject([
        {
            name: 'commonName',
            value: hostname
        },
    ]);
    cert.setIssuer([
        {
            name: 'commonName',
            value: hostname
        },
    ]);
    cert.setExtensions([
        {
            name: 'keyUsage',
            keyCertSign: true,
            digitalSignature: true,
            nonRepudiation: true,
            keyEncipherment: true,
            dataEncipherment: true
        }, {
            name: 'extKeyUsage',
            serverAuth: true,
            clientAuth: true,
        }, {
            name: 'nsCertType',
            client: true,
            server: true,
        }, {
            name: 'subjectAltName',
            altNames: [
                {
                    type: 2, // DNS hostname
                    value: hostname,
                },
                {
                    type: 7, // IP
                    ip: '127.0.0.1',
                },
            ]
        }, {
            name: 'subjectKeyIdentifier'
        }
    ]);
    cert.sign(keys.privateKey); // self-signed cert
    return {
        certificate: cert,
        privateKey: keys.privateKey,
    };
}

function serverAutoTLS() {
    let autoCert = createCertificate();
    let clientCert = process.env.PLUGIN_CLIENT_CERT;
    let certPEM = forge.pki.certificateToPem(autoCert.certificate);
    credentials = grpc.ServerCredentials.createSsl(
        Buffer.from(clientCert),
        [{
            private_key: Buffer.from(forge.pki.privateKeyToPem(autoCert.privateKey)),
            cert_chain: Buffer.from(certPEM),
        }],
        true,
    );

    // The rpcplugin handshake wants just a direct base64 encoding of the
    // certificate, without the PEM markers, so we'll convert that now too.
    let certASN1 = forge.pki.certificateToAsn1(autoCert.certificate);
    let certDER = forge.asn1.toDer(certASN1).getBytes();
    let certBase64 = forge.util.encode64(certDER);

    return {
        credentials: credentials,
        certBase64: certBase64,
    };
}


module.exports = {
    createCertificate: createCertificate,
    serverAutoTLS: serverAutoTLS,
};
