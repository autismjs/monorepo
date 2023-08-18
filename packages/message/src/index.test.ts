import tape from 'tape';
import { Post, Moderation } from './index';
import { MessageType, PostSubtype, ModerationSubtype } from '.';

tape('Message Format', (t) => {
  const postA = new Post({
    type: MessageType.Post,
    subtype: PostSubtype.Default,
    creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
    createdAt: new Date(0x018a01173656),
    content: 'hello world',
    topic: 'hello topic',
    title:
      '【夢幻！內蒙雨後雙彩虹與閃電同框】近日，內蒙古呼倫貝爾，雨後兩道彩虹橫跨蒼穹，在青山與小城之間架起七彩虹橋。雲層中多道閃電劃破天幕，在空中與彩虹美麗邂逅，夢幻無比。',
    reference:
      '0x5d432ce201d2c03234e314d4703559102Ebf365C/900450baa9176d246c9199b680f6516d2c813088b4d94372d6a47a5133d1b94d',
    attachment: [
      '0x5d432ce201d2c03234e314d4703559102Ebf365C/900450baa9176d246c9199b680f6516d2c813088b4d94372d6a47a5133d1b94d',
      'https://docs.zkitter.com/developers/api',
    ],
  });
  const postB = new Post(postA.hex);
  t.equal(postA.hex, postB.hex, 'should return same hex');
  console.log(
    new Moderation({
      type: MessageType.Moderation,
      subtype: ModerationSubtype.Like,
      createdAt: new Date(),
      creator: '0xa1b77ccf93a2b14174c322d673a87bfa0031a2d2',
      reference: postA.messageId,
      value: 'u-10000',
    }),
  );
  t.end();
});
