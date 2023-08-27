import crypto from 'crypto';
import CryptoJS from 'crypto-js';

export default class AES {
  #secret: string;

  constructor(secret?: string) {
    this.#secret =
      typeof secret === 'undefined'
        ? crypto.randomBytes(32).toString('hex')
        : secret;
  }

  get secret() {
    return this.#secret;
  }

  encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.secret).toString();
  }

  decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, this.#secret);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
