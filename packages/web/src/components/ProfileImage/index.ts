import { CustomElement, Q, register } from '../../../lib/ui.ts';
import { getStore } from '../../state';
import { default as NodeStore } from '../../state/node.ts';
import css from './index.scss';

export default class ProfileImage extends CustomElement {
  static get observedAttributes() {
    return ['address', 'width', 'height'];
  }

  css = css.toString();

  html = `
    <img />
  `;

  async connectedCallback() {
    super.connectedCallback();
    const address = this.getAttribute('address') || '';
    const width = this.getAttribute('width') || '';
    const height = this.getAttribute('height') || '';
    this.attributeChangedCallback('address', '', address);
    this.attributeChangedCallback('width', '', width);
    this.attributeChangedCallback('height', '', height);
  }

  attributeChangedCallback = async (
    key: string,
    oldVal: string,
    newVal: string,
  ) => {
    const store = getStore();
    const node: NodeStore = store.get('node');
    const img = Q(this.shadowRoot!)!.find('img')!;

    img.attr(key, newVal);

    if (key === 'address') {
      const user = await node.node.db.db.getProfile(key || '');
      img.attr(
        'src',
        user.profileImageUrl ||
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAABNZJREFUeF7tnFmW6jAMRJP975Ut0CcNnc5gR6XRcmL+HtFQqitDMzzm1+v1nsbN1oF5nqa3zNZ5ALFlUao2T9OE4ukXCGdKynNOLU4s0bdUigZSE2AojPIr+3VLK1YglkWzG5hZH31CMquvaku4XqAkNZD1DwqwoZ4v2AgM0+vRVDiLVANZ5HQxO+ib7yx0dRMg66x0P9AWfljD1nyxFxm2QEylIcW0GLT5lEZ+fRAIvzAl9enXq68moFfqFA/qemL3s0m/PCHZxCbmei2NYST4kAVawWgMVgTCbJqqq5AF/gOuQm2BCN67ARz3DyHNpCUYlPhtEgqEHksasdix3ND3VKV9/PPcgGAbU48qXcFq+pvm2cENCCb6CRZjTvxFNQbCE9t1NLh7sUBAUWmN3+j3GsUByDzN0/vw9OolPyE65qjHcDUQZn9jB9t2Nx6mzz97QxGENvvgLZwQZxVG5Y3KeCy5qmbxIQsaFgpSacub7DX7fJtX6nnZkcoOcNVP6mTDEcByYABh2aULRh7p3IBcN0ekgcMblgI74mECbW5ASNWnV0R+b9ZyfeHGk7MyAphAFFIVqYx5DEIpodR13feimEAM5tWWAPwgW1jUIJvIAkRA/OfRdEBz0biNsVTK9joVW+H1BSLMli0BkQVoAUJcpAUUFZ2QAF2PbWEE5MYrG7waRkBiVMPY4UCmbq+626cp6JuLTN2PCC/CqRNDWXZ1Qp4A+jZA0A1EoFrWQvptYxoAaTku1574+HggCXhIJEhyJP+1LB7IcekEkwpS4lcd6bgb5PMPGsiaJLChkCKogox2mxgayG1GLQ9iuiCaYsvn6e/xmXrQuuGkHnJCcEP4hGxr3wAIaEjhCZRvvjIDkEoAOVQACtKSTYrQbTqNAE/IMDGKLwjERk7XWIPEhwKxwdp3FYrrAJKM7wYIxa6knJfDi07m1EmOzzTjhDTgfvWjpWcgbPDsBDsLGra2G2JfiTwhN5zZy0tR3aO/JJC1yyCj+44oiAsHon9OByUlCGu4fDogCby7k4RlD3yBWGyaRY2OqPkCuTCi7PNy73LL96s+UXvRDEgfS2uFAa/jCAQX0QccnUrUDR4QtKpOO/uBzq1dg8JlIFfGN4fi6ZLzcED5IpDLPKCoh2WN2tZHcRJ08ZDF6ciJ9cDlVPM7VuR0vOcQzdyRU2l0Vt+RiBkgDoi1Sc3qlcBs76uAA3kOIJ5gQQhbCQOIJxBB7fZABFskmLObFCEQwkVjk5FySMyJiijJl+0eSEKBvuPnqy48IT6DxO9DfEfKuVRAKLF3vv63Gu5A8u1gbqyOQAYKCfpfICfr1jsiTV0PbcpPDCXmSnLMT0gkQsnAa06EUEEPcyAqk0ay37dOBMvRLQ75rOfMfCdEPp3rh0n/sgoCDTXnA9LtOQGFb776Xnwjv/R7WYbAaZVOzZzK0vNUIlA96hOCNhJPok1ML3A/oBqI1q+m+QlhNQWS0A96P5xFxwNxHoh29CpCKa6ajtVdotyBYFJ0Nt4pmwckm7vZ9BQ3gyeSB6TBKvLGaSDQuGV6IMbzfsq5U5Y3UAGRt3Wx+VzUU6CoNp2kAhJkq28b2iNGf30xBZBK8+/d+6t6oQxXug5VADnObW+6fcX8rPhAnuhSIEc+kEBxT2z1A58ObwvXw1MMAAAAAElFTkSuQmCC',
      );
    }
  };
}

register('profile-image', ProfileImage);
