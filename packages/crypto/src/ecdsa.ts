import EC, { ec } from 'elliptic';
import { bufferify, strip0x } from './utils/encoding';

export default class ECDSA {
  #key: ec.KeyPair;

  constructor(options?: { privateKey?: string; publicKey?: string }) {
    const e = new EC.ec('p256');

    if (options?.privateKey) {
      this.#key = e.keyFromPrivate(strip0x(options.privateKey));
    } else if (options?.publicKey) {
      this.#key = e.keyFromPublic(strip0x(options.publicKey), 'hex');
    } else {
      this.#key = e.genKeyPair();
    }
  }

  get privateKey(): string | null {
    const key = this.#key.getPrivate();
    return key ? '0x' + key.toString('hex') : null;
  }

  get publicKey(): string | null {
    const key = this.#key.getPublic();
    return key ? '0x' + key.encode('hex', true) : null;
  }

  sign(data: string | Buffer): string {
    const sig = this.#key.sign(bufferify(data));
    return '0x' + Buffer.from(sig.toDER()).toString('hex');
  }

  verify(data: string | Buffer, signature: string): boolean {
    return this.#key.verify(
      bufferify(data),
      Buffer.from(strip0x(signature), 'hex').toJSON().data,
    );
  }
}
