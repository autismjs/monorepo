import EC, { ec } from 'elliptic';
import { strip0x } from './utils/encoding';

export default class ECDH {
  #key: ec.KeyPair;

  constructor(options?: { privateKey?: string; publicKey?: string }) {
    const e = new EC.ec('curve25519');

    if (options?.privateKey) {
      this.#key = e.keyFromPrivate(strip0x(options.privateKey));
    } else if (options?.publicKey) {
      this.#key = e.keyFromPublic(strip0x(options.publicKey), 'hex');
    } else {
      this.#key = e.genKeyPair();
    }
  }

  get key() {
    return this.#key;
  }

  get privateKey(): string | null {
    const key = this.#key.getPrivate();
    return key ? '0x' + key.toString('hex') : null;
  }

  get publicKey(): string | null {
    const key = this.#key.getPublic();
    return key ? '0x' + key.encode('hex', true) : null;
  }

  derive(ecdh: ECDH): string {
    return '0x' + this.#key.derive(ecdh.key.getPublic()).toString(16);
  }
}
