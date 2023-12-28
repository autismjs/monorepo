import { Observable } from '../../lib/state.ts';
import { ECDSA } from '@autismjs/crypto/src';

export class Signer {
  $ecdsa: Observable<ECDSA | null> = new Observable<ECDSA | null>(null);

  async generateRandomPrivateKey() {
    this.$ecdsa.$ = new ECDSA();
  }

  get publicKey() {
    return this.$ecdsa.$?.publicKey || '';
  }
}

const $signer = new Signer();

export default $signer;
