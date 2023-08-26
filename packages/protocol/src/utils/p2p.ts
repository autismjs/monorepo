export const createLibp2pNode = async (
  options: {
    bootstrap?: string[];
    port?: number;
  } = {},
) => {
  const { createLibp2p } = await import('libp2p');
  const { webSockets } = await import('@libp2p/websockets');
  const { noise } = await import('@chainsafe/libp2p-noise');
  const { kadDHT } = await import('@libp2p/kad-dht');
  const { gossipsub } = await import('@chainsafe/libp2p-gossipsub');
  const { yamux } = await import('@chainsafe/libp2p-yamux');
  const { mplex } = await import('@libp2p/mplex');
  const { mdns } = await import('@libp2p/mdns');
  const { bootstrap: _bootstrap } = await import('@libp2p/bootstrap');
  // const { pipe } = await import('it-pipe');
  // const { fromString } = await import('uint8arrays/from-string');

  const peerDiscovery: any[] = [mdns({ interval: 1000 })];

  const { bootstrap = [], port = 8000 } = options;

  if (bootstrap.length) {
    peerDiscovery.push(
      _bootstrap({
        list: bootstrap,
      }),
    );
  }

  const node = await createLibp2p({
    addresses: {
      listen: [`/ip4/0.0.0.0/tcp/${port}/ws`],
    },
    transports: [webSockets()],
    streamMuxers: [yamux(), mplex()],
    connectionEncryption: [noise()],
    peerDiscovery,
    services: {
      dht: kadDHT(),
      pubsub: gossipsub({
        allowPublishToZeroPeers: true,
        emitSelf: false,
      }),
    },
  });

  return node;
};
