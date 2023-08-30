import crypto from 'crypto';
import { ECDSA } from '@autismjs/crypto';
import { MessageType, Post, PostSubtype, ProofType } from '@autismjs/message';

export const wait = (timeout: number): Promise<void> => {
  return new Promise((r) => setTimeout(r, timeout));
};

export const loop = (
  loops: number,
  fn: (i: number) => void | Promise<void>,
): Promise<void> => {
  return new Promise(async (r) => {
    for (let i = 0; i < loops; i++) {
      await fn(i);
    }
    r();
  });
};

export const perf = () => {
  const then = performance.now();
  return (fixed?: number) => {
    const now = performance.now();
    return fixed ? (now - then).toFixed(fixed) : now - then;
  };
};

let genesis = Math.floor((Date.now() - 1000000) / 1000);

export const randomPost = (
  content?: string | null,
  postOptions: {
    title?: string;
    topic?: string;
    attachment?: string[];
    creator?: ECDSA;
  } = {},
) => {
  const { title, topic, attachment, creator = new ECDSA() } = postOptions;

  const post = new Post({
    type: MessageType.Post,
    subtype: PostSubtype.Default,
    createdAt: new Date(genesis++ * 1000),
    creator: creator.publicKey!,
    content: content || crypto.randomBytes(16).toString('hex'),
    title,
    topic,
    attachment,
  });

  post.commit({
    type: ProofType.ECDSA,
    value: creator.sign(post.hash),
  });

  return {
    post,
    creator,
  };
};
