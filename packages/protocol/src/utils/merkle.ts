import crypto from 'crypto';

export type MerkleProps = {
  leaves: bigint[];
  depth: number;
};

export class Merkle {
  #leaves: bigint[];
  hashMap: Map<bigint, [number, number]>;
  #depth: number;
  hashes: bigint[][];

  constructor(options?: {
    [P in keyof MerkleProps]?: MerkleProps[P];
  }) {
    this.#leaves = options?.leaves || [];
    this.#depth = options?.depth || 0;
    this.hashes = [];
    this.hashMap = new Map();
    this.#recalc();
  }

  get leaves() {
    return this.#leaves;
  }

  get maxLeaves() {
    return Math.pow(2, this.#depth - 1);
  }

  get root(): bigint {
    const dep = this.hashes[0] || [];
    const root = dep[0] || BigInt(0x0);
    return root;
  }

  #recalc() {
    this.hashes = [];
    this.hashMap = new Map();
    this.#merklize();
  }

  #merklize(depth = 0, index = 0): bigint {
    if (this.#leaves.length > Math.pow(2, this.#depth - 1)) {
      throw new Error('maximum leaves exceed depth');
    }

    this.hashes[depth] = this.hashes[depth] || [];

    let hash = BigInt(0x0);

    if (depth === this.#depth - 1) {
      hash = this.#leaves[index] || BigInt(0x0);
    } else {
      hash = sha256(
        this.#merklize(depth + 1, index * 2),
        this.#merklize(depth + 1, index * 2 + 1),
        depth,
        index,
      );
    }

    this.hashes[depth][index] = hash;
    this.hashMap.set(hash, [depth, index]);

    return hash;
  }

  getHash(hash: bigint) {
    const leaf = this.hashMap.get(hash);

    if (leaf) return leaf;

    return null;
  }

  addLeaf(leaf: bigint) {
    if (!this.hashMap.get(leaf)) {
      this.#leaves.push(leaf);
      this.#recalc();
    }
  }

  getChildren(leaf: bigint): bigint[] | null {
    const node = this.hashMap.get(leaf);

    if (!node) {
      return [this.hashes[1][0], this.hashes[1][1]];
    }

    const [depth, index] = node;

    if (depth >= this.hashes.length) {
      return null;
    }

    const left = (this.hashes[depth + 1] || [])[index * 2];
    const right = (this.hashes[depth + 1] || [])[index * 2 + 1];

    if (typeof left === 'undefined') return null;
    if (typeof right === 'undefined') return null;

    return [left, right];
  }

  getProof(leaf: bigint): bigint[] | null {
    const node = this.hashMap.get(leaf);

    if (!node) return null;

    const [depth, index] = node;
    const paths = [leaf];

    let dep = depth;
    let ptr = index;

    while (dep > 0) {
      dep = dep - 1;
      ptr = Math.floor(ptr / 2);
      const next = this.hashes[dep][ptr];
      paths.push(next);
    }

    return paths;
  }

  verify(proof: bigint[]) {
    const leaf = proof[0];
    const root = proof[proof.length - 1];

    if (root !== this.root) {
      return false;
    }

    const node = this.hashMap.get(leaf);

    if (!node) return false;

    const [depth] = node;

    let dep = depth;

    while (dep < this.#depth) {
      const hash = proof[dep - depth];
      const next = this.hashMap.get(hash);

      if (!next) return false;

      dep = dep + 1;
    }

    return true;
  }
}

const sha256 = (...numbers: (number | bigint)[]): bigint => {
  let h = crypto.createHash('sha256');
  numbers.forEach((num) => {
    h = h.update(num.toString());
  });
  return BigInt('0x' + h.digest('hex'));
};
