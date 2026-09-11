// A real child/pipe fixture for driver failure and cleanup tests. No SAP runtime needed.
import net from 'node:net';
import { StreamMessageReader, StreamMessageWriter, createMessageConnection } from 'vscode-jsonrpc/node.js';

if (process.env.ADTLS_FIXTURE_MODE === 'exit') process.exit(2);
const pipe = process.argv.find((arg) => arg.startsWith('--pipe=')).slice(7);
const socket = net.connect(pipe);
socket.on('error', () => process.exit(1));
const conn = createMessageConnection(new StreamMessageReader(socket), new StreamMessageWriter(socket));
conn.onRequest('initialize', async () => {
  if (process.env.ADTLS_FIXTURE_MODE === 'hang') await new Promise(() => {});
  return {
    serverInfo: {
      name: 'ADTLS',
      version: process.env.ADTLS_FIXTURE_MODE === 'old' ? '1.0.1.202606111342' : '1.1.2.202608131517',
    },
    capabilities: { testPipe: pipe },
  };
});
conn.listen();
