import { Observable } from '../../lib/state.ts';
import { ECDSA, ZK } from '@crypto';

export class Signer {
  $identity: Observable<ZK | ECDSA | null> = new Observable<ZK | ECDSA | null>(
    null,
  );

  get publicKey() {
    if (this.$identity instanceof ECDSA) return this.$identity.publicKey;
    return '';
  }

  async generateRandomPrivateKey() {
    this.$identity.$ = new ECDSA();
  }

  async generateRandomZKIdentity() {
    this.$identity.$ = new ZK();
  }
}

const $signer = new Signer();

export default $signer;
