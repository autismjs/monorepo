import { ZkIdentity, Strategy } from '@zk-kit/identity';
import { MerkleProof } from '@zk-kit/incremental-merkle-tree';
import { sha256, strip0x } from './utils/encoding';
import {
  genExternalNullifier,
  RLN,
  RLNFullProof,
  Semaphore,
  SemaphoreFullProof,
} from '@zk-kit/protocols';
import RLNCircuit from '../static/rln/circuit.json';
import RLNZKey from '../static/rln/zkey.json';
import RLNVKey from '../static/rln/verification_key.json';

import SemaphoreCircuit from '../static/semaphore/circuit.json';
import SemaphoreZKey from '../static/semaphore/zkey.json';
import SemaphoreVKey from '../static/semaphore/verification_key.json';

const { poseidon } = require('circomlibjs');

const RLNCircuitBuf = Buffer.from((RLNCircuit as any).data);
const RLNZKeyBuf = Buffer.from((RLNZKey as any).data);
const SemaphoreCircuitBuf = Buffer.from((SemaphoreCircuit as any).data);
const SemaphoreZKeyBuf = Buffer.from((SemaphoreZKey as any).data);

export default class ZK {
  static async verifyRLNProof(signal: string, proof: RLNFullProof) {
    const verified = await RLN.verifyProof(RLNVKey as any, proof);
    const signalHash = RLN.genSignalHash(signal).toString(16);
    return verified && signalHash === proof.publicSignals.signalHash;
  }

  static async verifySemaphoreProof(signal: string, proof: SemaphoreFullProof) {
    const verified = await Semaphore.verifyProof(SemaphoreVKey as any, proof);
    const signalHash = Semaphore.genSignalHash(signal).toString(16);
    return verified && signalHash === proof.publicSignals.signalHash;
  }

  static async retrieveRLNCommitment(
    x1: string | bigint,
    x2: string | bigint,
    y1: string | bigint,
    y2: string | bigint,
  ) {
    const secretHash = RLN.retrieveSecret(
      BigInt(x1),
      BigInt(x2),
      BigInt(y1),
      BigInt(y2),
    );

    return '0x' + poseidon([secretHash]).toString(16).padStart(64, '0');
  }

  accessor identity: ZkIdentity;

  constructor(secret?: string) {
    if (!secret) {
      this.identity = new ZkIdentity(Strategy.RANDOM);
    } else {
      const hex = strip0x(secret).padStart(128, '0');
      const trapdoor = hex.slice(0, 64);
      const nullifier = hex.slice(64);

      this.identity = new ZkIdentity(
        Strategy.SERIALIZED,
        JSON.stringify({
          identityNullifier: nullifier,
          identityTrapdoor: trapdoor,
          secret: [nullifier, trapdoor],
        }),
      );
    }
  }

  get commitment(): string {
    return (
      '0x' +
      this.identity.genIdentityCommitment().toString(16).padStart(64, '0')
    );
  }

  get secret(): string {
    const nullifier = this.identity.getNullifier();
    const trapdoor = this.identity.getTrapdoor();

    return (
      '0x' +
      trapdoor.toString(16).padStart(64, '0') +
      nullifier.toString(16).padStart(64, '0')
    );
  }

  async genRLNProof(args: {
    epoch: string;
    signal: string;
    merkleProof: MerkleProof;
    circuits?: {
      wasm?: string;
      zkey?: string;
    };
  }): Promise<RLNFullProof> {
    const identitySecretHash = this.identity.getSecretHash();
    const externalNullifier = genExternalNullifier(args.epoch);
    const rlnIdentifier = sha256('autism.rln', 'hex');
    const witness = RLN.genWitness(
      identitySecretHash,
      args.merkleProof,
      externalNullifier,
      args.signal,
      BigInt('0x' + rlnIdentifier),
    );

    return RLN.genProof(
      witness,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      args.circuits?.wasm || RLNCircuitBuf,
      args.circuits?.zkey || RLNZKeyBuf,
    );
  }

  async genSemaphoreProof(args: {
    signal: string;
    merkleProof: MerkleProof;
    circuits?: {
      wasm?: string;
      zkey?: string;
    };
  }): Promise<SemaphoreFullProof> {
    const witness = Semaphore.genWitness(
      this.identity.getTrapdoor(),
      this.identity.getNullifier(),
      args.merkleProof,
      BigInt('0x' + sha256('autism.semaphore', 'hex')),
      args.signal,
    );

    return Semaphore.genProof(
      witness,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      args.circuits?.wasm || SemaphoreCircuitBuf,
      args.circuits?.zkey || SemaphoreZKeyBuf,
    );
  }
}
