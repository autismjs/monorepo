export class Reference {
  #creator?: string;
  #hash: string;
  #reference: string;

  static from(reference: string | { creator?: string; hash: string }) {
    return new Reference(reference);
  }

  get creator() {
    return this.#creator;
  }
  get hash() {
    return this.#hash;
  }
  get reference() {
    return this.#reference;
  }

  constructor(reference: string | { creator?: string; hash: string }) {
    const [creator, hash] =
      typeof reference === 'string'
        ? reference?.split('/') || []
        : [reference.creator, reference.hash];
    this.#creator = creator;
    this.#hash = hash || creator!;
    this.#reference =
      typeof reference === 'string' ? reference : [creator, hash].join('/');
  }
}
