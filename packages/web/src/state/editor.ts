import { Observable, ObservableMap } from '../../lib/state';

export class Editor {
  reference = new Observable('');
  drafts = new ObservableMap<string, { content: string }>();
}

const $editor = new Editor();

export default $editor;
