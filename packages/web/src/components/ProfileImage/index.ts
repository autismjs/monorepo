import { connect, CustomElement, h, register } from '../../../lib/ui.ts';
import $node from '../../state/node.ts';
import css from './index.scss';
import BlankImage from '../../../static/icons/blank.svg';
// @ts-ignore
import { minidenticon } from 'minidenticons';

@connect((el) => $node.$users.get(el.state.creator || ''))
export default class ProfileImage extends CustomElement {
  static get observedAttributes() {
    return ['creator'];
  }

  css = css.toString();

  render() {
    let url = BlankImage;
    if (this.$.profileImageUrl) {
      url = this.$.profileImageUrl;
    } else if (this.state.creator) {
      url =
        'data:image/svg+xml;utf8,' + minidenticon(this.state.creator, 50, 50);
    }

    return h('img', { src: url });
  }
}

register('profile-image', ProfileImage);
